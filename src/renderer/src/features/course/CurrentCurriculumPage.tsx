import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useNotifications } from '../notifications/Notifications'
import FullScreenLoader from '../shell/FullScreenLoader'
import { getRegistrationOptions, type RegistrationOptions } from './courseApi'
import {
  getCurrentCurriculumContent,
  setCourseBookActive,
  setCurrentCurriculumBook,
  type CurriculumContent
} from './curriculumApi'

export default function CurrentCurriculumPage({
  onBack
}: {
  onBack: () => void
}): React.JSX.Element {
  const notify = useNotifications()
  const [options, setOptions] = useState<RegistrationOptions | null>(null)
  const [selectedKey, setSelectedKey] = useState('')
  const [contents, setContents] = useState<CurriculumContent[]>([])
  const [loading, setLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [contentError, setContentError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    getRegistrationOptions()
      .then((result) => {
        if (!active) return
        setOptions(result)
        setSelectedKey((previous) =>
          result.exams.some((exam) => exam.exam_key === previous)
            ? previous
            : (result.exams.find((exam) => exam.is_current)?.exam_key ??
              result.exams[0]?.exam_key ??
              '')
        )
        setError('')
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load curriculum')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [retry])

  useEffect(() => {
    if (!selectedKey) return
    let active = true
    setContents([])
    setContentError('')
    setContentLoading(true)
    getCurrentCurriculumContent(selectedKey)
      .then((result) => {
        if (active) setContents(result.results)
      })
      .catch((cause) => {
        if (active)
          setContentError(cause instanceof Error ? cause.message : 'Could not load questions')
      })
      .finally(() => {
        if (active) setContentLoading(false)
      })
    return () => {
      active = false
    }
  }, [selectedKey, retry])

  const selected = options?.exams.find((exam) => exam.exam_key === selectedKey)
  const current = options?.exams.find((exam) => exam.is_current)
  const languageProgress = (options?.languages ?? [])
    .filter((language) => language.is_active)
    .map((language) => ({
      ...language,
      content: contents.find((content) => content.language_code === language.code)
    }))
  const readyCount = languageProgress.filter(({ content }) => content?.is_ready).length

  async function makeCurrent(): Promise<void> {
    if (!options || !selected) return
    if (!window.confirm(`Make ${selected.title} the current month? Its books can then be sent.`))
      return
    setSaving(true)
    try {
      await setCurrentCurriculumBook(options.course.course_key, selected.sequence)
      notify.success(`${selected.title} is now the current month`)
      setRetry((value) => value + 1)
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not set the current month')
    } finally {
      setSaving(false)
    }
  }

  async function toggleRegistration(): Promise<void> {
    if (!selected || selected.is_current) return
    setSaving(true)
    try {
      await setCourseBookActive(selected.exam_key, !selected.is_active)
      notify.success(selected.is_active ? 'Registration closed' : 'Registration opened')
      setRetry((value) => value + 1)
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not update registration')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page course-page">
      <div className="course-toolbar curriculum-toolbar">
        <Button variant="outline" onClick={onBack}>
          ← Course
        </Button>
        <h1>Curriculum</h1>
        <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>
          Refresh
        </Button>
      </div>
      {error && <p className="course-error">{error}</p>}
      {options && (
        <div className="curriculum-layout">
          <div className="curriculum-current">
            <span>Current month</span>
            <strong>
              {current ? `${String(current.sequence).padStart(2, '0')} · ${current.title}` : 'None'}
            </strong>
          </div>
          <div className="curriculum-panel">
            <label className="curriculum-book-picker">
              <span>Book</span>
              <select value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
                {options.exams
                  .slice()
                  .sort((a, b) => a.sequence - b.sequence)
                  .map((exam) => (
                    <option key={exam.exam_key} value={exam.exam_key}>
                      {String(exam.sequence).padStart(2, '0')} · {exam.title}
                    </option>
                  ))}
              </select>
            </label>
            {selected && (
              <div className="curriculum-book-details">
                <div className="curriculum-book-status">
                  <span
                    className={
                      selected.is_current
                        ? 'curriculum-tag curriculum-tag--current'
                        : 'curriculum-tag'
                    }
                  >
                    {selected.is_current
                      ? 'Current'
                      : selected.is_released
                        ? 'Ready to send'
                        : 'Not ready to send'}
                  </span>
                  <span
                    className={
                      selected.is_active ? 'curriculum-tag curriculum-tag--open' : 'curriculum-tag'
                    }
                  >
                    Registration {selected.is_active ? 'open' : 'closed'}
                  </span>
                </div>
                <div className="curriculum-actions">
                  <Button
                    variant="outline"
                    disabled={saving || selected.is_current}
                    onClick={() => void toggleRegistration()}
                  >
                    {selected.is_active ? 'Close registration' : 'Open registration'}
                  </Button>
                  <Button
                    disabled={saving || selected.is_current || !selected.is_active}
                    onClick={() => void makeCurrent()}
                  >
                    {saving ? 'Saving…' : 'Make current'}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <section className="curriculum-questions">
            <div className="curriculum-section-heading">
              <h2>Questions</h2>
              {!contentLoading && !contentError && languageProgress.length > 0 && (
                <span>
                  {readyCount} of {languageProgress.length} ready
                </span>
              )}
            </div>
            {contentError && <p className="course-error">{contentError}</p>}
            {contentLoading ? (
              <p className="curriculum-empty">Loading questions…</p>
            ) : contentError ? null : languageProgress.length ? (
              <div className="curriculum-language-grid">
                {languageProgress.map(({ code, name, content }) => (
                  <div className="curriculum-language" key={code}>
                    <div className="curriculum-language__heading">
                      <h3>{name}</h3>
                      <span className={content?.is_ready ? 'curriculum-ready' : ''}>
                        {content?.is_ready ? 'Ready' : 'Not ready'}
                      </span>
                    </div>
                    <div className="curriculum-language__count">
                      <strong>{content?.question_count ?? 0}</strong>
                      <span> / 100 questions</span>
                    </div>
                    <div className="curriculum-language__track" aria-hidden="true">
                      <span
                        style={{
                          width: `${Math.min(100, Math.max(0, content?.question_count ?? 0))}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="curriculum-empty">No languages yet.</p>
            )}
          </section>
        </div>
      )}
      {loading && <FullScreenLoader message="Loading curriculum" />}
    </section>
  )
}
