import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { countries } from '../country/CountryContext'
import { useNotifications } from '../notifications/Notifications'
import FullScreenLoader from '../shell/FullScreenLoader'
import { getRegistrationOptions } from './courseApi'
import {
  createCourseLanguage,
  getCourseLanguages,
  updateLanguageAvailability,
  updateLanguageCountries,
  type CourseLanguage
} from './courseLanguagesApi'

export default function CourseLanguagesPage({ onBack }: { onBack: () => void }): React.JSX.Element {
  const notify = useNotifications()
  const [courseKey, setCourseKey] = useState('')
  const [languages, setLanguages] = useState<CourseLanguage[]>([])
  const [selectedKey, setSelectedKey] = useState('')
  const selectedKeyRef = useRef('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [countrySelection, setCountrySelection] = useState<string[]>([])
  const [online, setOnline] = useState(false)
  const [offline, setOffline] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    getRegistrationOptions()
      .then((result) => {
        if (active) setCourseKey(result.course.course_key)
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Could not load course')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!courseKey) return
    let active = true
    getCourseLanguages(courseKey)
      .then((result) => {
        if (!active) return
        setLanguages(result.results)
        const selected =
          result.results.find((item) => item.language_key === selectedKeyRef.current) ??
          result.results[0]
        if (selected) selectLanguage(selected)
        setError('')
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load languages')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [courseKey, retry])

  function selectLanguage(language: CourseLanguage): void {
    selectedKeyRef.current = language.language_key
    setSelectedKey(language.language_key)
    setCountrySelection(language.available_countries)
    setOnline(language.online_enabled)
    setOffline(language.offline_enabled)
  }

  async function addLanguage(): Promise<void> {
    if (!name.trim() || !code.trim()) return
    setBusy(true)
    try {
      await createCourseLanguage(courseKey, code.trim().toLowerCase(), name.trim())
      setName('')
      setCode('')
      setRetry((value) => value + 1)
      notify.success('Language created. Select its countries next.')
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not create language')
    } finally {
      setBusy(false)
    }
  }

  async function saveCountries(): Promise<void> {
    if (!selectedKey) return
    setBusy(true)
    try {
      await updateLanguageCountries(selectedKey, countrySelection)
      setRetry((value) => value + 1)
      notify.success('Language countries saved')
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not save countries')
    } finally {
      setBusy(false)
    }
  }

  async function saveAvailability(): Promise<void> {
    if (!selectedKey) return
    if ((online || offline) && !countrySelection.length) {
      notify.error('Select and save at least one country first.')
      return
    }
    setBusy(true)
    try {
      await updateLanguageAvailability(selectedKey, online, offline)
      setRetry((value) => value + 1)
      notify.success('Study-mode availability saved')
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not update availability')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="page course-page">
      <div className="course-toolbar">
        <Button variant="outline" onClick={onBack}>
          ← Course
        </Button>
        <h1>Language and Country</h1>
        <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>
          Refresh
        </Button>
      </div>
      {error && <p className="course-error">{error}</p>}
      <div className="course-language-layout">
        <section className="candidate-form">
          <h2>1. Create language</h2>
          <div className="course-language-create">
            <label>
              Name
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Tamil"
              />
            </label>
            <label>
              Code
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="ta"
              />
            </label>
            <Button
              disabled={busy || !name.trim() || !code.trim()}
              onClick={() => void addLanguage()}
            >
              Add language
            </Button>
          </div>
          <div className="course-language-list">
            {languages.map((language) => (
              <button
                key={language.language_key}
                className={
                  language.language_key === selectedKey
                    ? 'course-language-item is-selected'
                    : 'course-language-item'
                }
                onClick={() => selectLanguage(language)}
              >
                <strong>{language.name}</strong>
                <small>
                  {language.code} · {language.available_countries.length} countries
                </small>
              </button>
            ))}
          </div>
        </section>
        {selectedKey && (
          <section className="candidate-form">
            <h2>2. Choose countries</h2>
            <div className="course-language-countries">
              {countries.map(([value, label]) => (
                <label key={value}>
                  <input
                    type="checkbox"
                    checked={countrySelection.includes(value)}
                    onChange={(event) =>
                      setCountrySelection((current) =>
                        event.target.checked
                          ? [...current, value]
                          : current.filter((item) => item !== value)
                      )
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
            <Button disabled={busy} onClick={() => void saveCountries()}>
              Save countries
            </Button>
            <h2 className="course-language-subheading">3. Study-mode availability</h2>
            <div className="course-language-countries">
              <label>
                <input
                  type="checkbox"
                  checked={online}
                  onChange={(event) => setOnline(event.target.checked)}
                />{' '}
                Online
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={offline}
                  onChange={(event) => setOffline(event.target.checked)}
                />{' '}
                Offline
              </label>
            </div>
            <Button variant="outline" disabled={busy} onClick={() => void saveAvailability()}>
              Save availability
            </Button>
          </section>
        )}
      </div>
      {loading && <FullScreenLoader message="Loading course languages" />}
    </section>
  )
}
