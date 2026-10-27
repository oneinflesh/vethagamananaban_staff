import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import FullScreenLoader from '../shell/FullScreenLoader'
import { getRegistrationOptions, type ExamInfo } from './courseApi'
import { getCurrentCurriculumContent, type CurriculumContent } from './curriculumApi'

export default function CurrentCurriculumPage({
  onBack
}: {
  onBack: () => void
}): React.JSX.Element {
  const [exam, setExam] = useState<ExamInfo | null>(null)
  const [contents, setContents] = useState<CurriculumContent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    getRegistrationOptions()
      .then(async (result) => {
        const current = result.exams.find((item) => item.is_current) ?? null
        const content = current ? await getCurrentCurriculumContent(current.exam_key) : null
        if (active) {
          setExam(current)
          setContents(content?.results ?? [])
          setError('')
        }
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
      {!loading && !error && !exam && <p className="course-error">No course month is active.</p>}
      {exam && (
        <>
          <div className="course-curriculum-summary candidate-form">
            <span>Month {exam.sequence}</span>
            <h2>{exam.title}</h2>
            <p>
              {exam.scheduled_month ?? 'Month not scheduled'} ·{' '}
              {exam.is_released ? 'Released' : 'Not released'}
            </p>
            <p>Course book: {exam.catalog_book_name}</p>
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
            {!contents.length && <p>No language content has been added for this month.</p>}
          </div>
        </>
      )}
      {loading && <FullScreenLoader message="Loading current curriculum" />}
    </section>
  )
}
