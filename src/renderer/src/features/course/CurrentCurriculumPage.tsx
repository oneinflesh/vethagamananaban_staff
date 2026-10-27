import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useNotifications } from '../notifications/Notifications'
import FullScreenLoader from '../shell/FullScreenLoader'
import { getRegistrationOptions, type ExamInfo, type RegistrationOptions } from './courseApi'
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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
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
    getCurrentCurriculumContent(selectedKey)
      .then((result) => {
        if (active) setContents(result.results)
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load questions')
      })
    return () => {
      active = false
    }
  }, [selectedKey, retry])

  const selected: ExamInfo | undefined = options?.exams.find(
    (exam) => exam.exam_key === selectedKey
  )
  const current = options?.exams.find((exam) => exam.is_current)

  async function activate(): Promise<void> {
    if (!options || !selected) return
    if (
      !window.confirm(
        `Set month ${selected.sequence} (${selected.title}) as the current course book? This also releases it for dispatch.`
      )
    )
      return
    setSaving(true)
    try {
      await setCurrentCurriculumBook(options.course.course_key, selected.sequence)
      notify.success(`${selected.title} is now the current course book`)
      setRetry((value) => value + 1)
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not activate this month')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(): Promise<void> {
    if (!selected || selected.is_current) return
    setSaving(true)
    try {
      await setCourseBookActive(selected.exam_key, !selected.is_active)
      notify.success(selected.is_active ? 'Book deactivated' : 'Book activated for registration')
      setRetry((value) => value + 1)
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not update book availability')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page course-page">
      <div className="course-toolbar">
        <Button variant="outline" onClick={onBack}>
          ← Course
        </Button>
        <h1>Current Month Curriculum</h1>
        <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>
          Refresh
        </Button>
      </div>
      {error && <p className="course-error">{error}</p>}
      {options && (
        <>
          <div className="course-curriculum-summary candidate-form">
            <p>
              Current book:{' '}
              {current ? `Month ${current.sequence} · ${current.title}` : 'None selected'}
            </p>
            <label>
              Choose a course book
              <select value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
                {options.exams
                  .slice()
                  .sort((a, b) => a.sequence - b.sequence)
                  .map((exam) => (
                    <option key={exam.exam_key} value={exam.exam_key}>
                      {String(exam.sequence).padStart(2, '0')} · {exam.title}
                      {exam.is_current ? ' (current)' : ''}
                    </option>
                  ))}
              </select>
            </label>
            {selected && (
              <>
                <p>
                  {selected.is_released ? 'Released' : 'Not released'} ·{' '}
                  {selected.is_active ? 'Active book' : 'Inactive book'}
                </p>
                <p>Course book: {selected.catalog_book_name}</p>
                <Button
                  variant="outline"
                  disabled={saving || selected.is_current}
                  onClick={() => void toggleActive()}
                >
                  {selected.is_active ? 'Deactivate for registration' : 'Activate for registration'}
                </Button>{' '}
                <Button
                  disabled={saving || selected.is_current || !selected.is_active}
                  onClick={() => void activate()}
                >
                  {saving ? 'Activating…' : 'Set as current month'}
                </Button>
              </>
            )}
          </div>
          <div className="course-curriculum-languages">
            {contents.map((content) => (
              <div className="candidate-form" key={content.content_key}>
                <h3>{content.language_name}</h3>
                <p>{content.title}</p>
                <strong>{content.question_count} / 100 questions</strong>
                <span>{content.is_ready ? 'Ready' : 'Not ready'}</span>
              </div>
            ))}
            {!contents.length && <p>No language questions have been added for this book.</p>}
          </div>
        </>
      )}
      {loading && <FullScreenLoader message="Loading current curriculum" />}
    </section>
  )
}
