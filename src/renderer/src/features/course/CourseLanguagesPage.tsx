import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCountry } from '../country/CountryContext'
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
  const { countries, addCountry } = useCountry()
  const [courseKey, setCourseKey] = useState('')
  const [languages, setLanguages] = useState<CourseLanguage[]>([])
  const [selectedKey, setSelectedKey] = useState('')
  const selectedKeyRef = useRef('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [countryName, setCountryName] = useState('')
  const [countryCode, setCountryCode] = useState('')
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

  async function createCountry(): Promise<void> {
    if (!/^[a-z]{2}$/i.test(countryCode.trim()) || !countryName.trim()) {
      notify.error('Enter a two-letter country code and name.')
      return
    }
    setBusy(true)
    try {
      await addCountry(countryCode, countryName)
      setCountryCode('')
      setCountryName('')
      notify.success('Country added. You can now enable it for a language.')
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not add country')
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

  const selectedLanguage = languages.find((item) => item.language_key === selectedKey)

  return (
    <section className="page course-page course-language-page">
      <div className="course-toolbar course-language-toolbar">
        <Button variant="outline" onClick={onBack}>
          ← Course
        </Button>
        <h1>Language and Country</h1>
        <span>
          {languages.length} languages · {countries.length} countries
        </span>
        <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>
          Refresh
        </Button>
      </div>
      {error && <p className="course-error">{error}</p>}
      <div className="course-language-layout">
        <aside className="course-language-rail">
          <div className="course-language-section-heading">
            <div>
              <small>STEP 01</small>
              <h2>Languages</h2>
            </div>
            <span>{languages.length}</span>
          </div>
          <div className="course-language-list" aria-label="Course languages">
            {languages.map((language) => (
              <button
                type="button"
                key={language.language_key}
                className={`course-language-item${language.language_key === selectedKey ? ' is-selected' : ''}`}
                onClick={() => selectLanguage(language)}
              >
                <span className="course-language-item-main">
                  <strong>{language.name}</strong>
                  <small>
                    {language.code.toUpperCase()} · {language.available_countries.length} countries
                  </small>
                </span>
                <span className={`course-language-status${language.is_active ? ' is-live' : ''}`}>
                  {language.is_active ? 'Live' : 'Draft'}
                </span>
              </button>
            ))}
          </div>
          <div className="course-language-rail-form">
            <h3>Add language</h3>
            <label>
              Language name
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Tamil"
              />
            </label>
            <label>
              Language code
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
        </aside>
        <div className="course-language-workspace">
          {selectedLanguage ? (
            <>
              <section className="course-language-panel">
                <div className="course-language-section-heading">
                  <div>
                    <small>STEP 02</small>
                    <h2>Available countries</h2>
                  </div>
                  <span>{countrySelection.length} selected</span>
                </div>
                <p>Choose where {selectedLanguage.name} is available.</p>
                <div className="course-language-countries">
                  {countries.map(({ code: value, name: label }) => (
                    <label
                      key={value}
                      className={countrySelection.includes(value) ? 'is-selected' : ''}
                    >
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
                      <span>{label}</span>
                      <small>{value}</small>
                    </label>
                  ))}
                </div>
                <div className="course-language-panel-actions">
                  <Button disabled={busy} onClick={() => void saveCountries()}>
                    Save countries
                  </Button>
                </div>
              </section>
              <section className="course-language-panel">
                <div className="course-language-section-heading">
                  <div>
                    <small>STEP 03</small>
                    <h2>Study modes</h2>
                  </div>
                </div>
                <div className="course-language-modes">
                  <label className={online ? 'is-selected' : ''}>
                    <input
                      type="checkbox"
                      checked={online}
                      onChange={(event) => setOnline(event.target.checked)}
                    />
                    <span>
                      <strong>Online</strong>
                      <small>Allow online course registrations</small>
                    </span>
                  </label>
                  <label className={offline ? 'is-selected' : ''}>
                    <input
                      type="checkbox"
                      checked={offline}
                      onChange={(event) => setOffline(event.target.checked)}
                    />
                    <span>
                      <strong>Offline</strong>
                      <small>Allow offline course registrations</small>
                    </span>
                  </label>
                </div>
                <div className="course-language-panel-actions">
                  <Button variant="outline" disabled={busy} onClick={() => void saveAvailability()}>
                    Save study modes
                  </Button>
                </div>
              </section>
            </>
          ) : (
            <section className="course-language-panel course-language-empty">
              <h2>Select a language</h2>
              <p>Choose a language on the left to set its countries and study modes.</p>
            </section>
          )}
          <section className="course-language-panel course-language-add-country">
            <div className="course-language-section-heading">
              <div>
                <small>COUNTRY CATALOG</small>
                <h2>Add a country</h2>
              </div>
            </div>
            <div className="course-language-create">
              <label>
                Country name
                <Input
                  value={countryName}
                  onChange={(event) => setCountryName(event.target.value)}
                  placeholder="Germany"
                />
              </label>
              <label>
                Two-letter code
                <Input
                  value={countryCode}
                  onChange={(event) => setCountryCode(event.target.value.toUpperCase())}
                  maxLength={2}
                  placeholder="DE"
                />
              </label>
              <Button
                disabled={busy || !countryName.trim() || countryCode.trim().length !== 2}
                onClick={() => void createCountry()}
              >
                Add country
              </Button>
            </div>
          </section>
        </div>
      </div>
      {loading && <FullScreenLoader message="Loading course languages" />}
    </section>
  )
}
