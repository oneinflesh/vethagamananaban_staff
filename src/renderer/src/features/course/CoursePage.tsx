import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCountry } from '../country/CountryContext'
import CandidateList from './CandidateList'
import CandidateDetails from './CandidateDetails'
import CoordinatorDetails from './CoordinatorDetails'
import { getCandidateCounts, type CandidateCounts } from './courseApi'
import './course.css'

export type CourseSection = 'all' | 'online' | 'offline' | 'discontinued' | 'finished'
const sections: { id: CourseSection; title: string; description: string }[] = [
  { id: 'all', title: 'All candidates', description: 'Every course registration' },
  { id: 'online', title: 'Online candidates', description: 'Online study mode' },
  { id: 'offline', title: 'Offline candidates', description: 'Postal study mode' },
  { id: 'discontinued', title: 'Discontinued candidates', description: 'Suspended registrations' },
  { id: 'finished', title: 'Course finished candidates', description: 'Completed courses' }
]
export default function CoursePage(): React.JSX.Element {
  const { country } = useCountry()
  const [section, setSection] = useState<CourseSection | null>(null)
  const [candidateKey, setCandidateKey] = useState<string | null>(null)
  const [coordinatorKey, setCoordinatorKey] = useState<string | null>(null)
  const [counts, setCounts] = useState<{ country: string; values: CandidateCounts } | null>(null)
  const [countError, setCountError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (section || candidateKey || coordinatorKey) return
    let active = true
    Promise.all([
      getCandidateCounts(country),
      new Promise<void>((resolve) => window.setTimeout(resolve, 400))
    ])
      .then(([result]) => {
        if (active) {
          setCounts({ country, values: result })
          setCountError(null)
        }
      })
      .catch(() => {
        if (active) setCountError(country)
      })
    return () => {
      active = false
    }
  }, [country, section, candidateKey, coordinatorKey, retry])
  const visibleCounts = counts?.country === country ? counts.values : null
  if (coordinatorKey)
    return (
      <CoordinatorDetails
        key={coordinatorKey}
        coordinatorKey={coordinatorKey}
        onBack={() => setCoordinatorKey(null)}
        onCandidate={(key) => {
          setCoordinatorKey(null)
          setCandidateKey(key)
        }}
      />
    )
  if (candidateKey)
    return (
      <CandidateDetails
        key={candidateKey}
        candidateKey={candidateKey}
        onBack={() => setCandidateKey(null)}
        onCoordinator={setCoordinatorKey}
      />
    )
  if (section)
    return (
      <CandidateList
        key={`${section}:${country}`}
        section={section}
        country={country}
        onBack={() => {
          setCounts(null)
          setSection(null)
        }}
        onCandidate={setCandidateKey}
        onCoordinator={setCoordinatorKey}
      />
    )
  return (
    <section className="page course-page">
      <div className="course-heading">
        <h1>Course</h1>
        <span>{country}</span>
      </div>
      {countError === country ? (
        <div className="course-error">
          Could not load candidate counts.{' '}
          <Button
            variant="link"
            onClick={() => {
              setCountError(null)
              setCounts(null)
              setRetry((value) => value + 1)
            }}
          >
            Retry
          </Button>
        </div>
      ) : visibleCounts ? (
        <div className="course-card-grid">
          {sections.map((item) => (
            <button className="course-nav-card" key={item.id} onClick={() => setSection(item.id)}>
              <span className="course-nav-card__count">{visibleCounts[item.id]}</span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
              <span className="course-nav-card__arrow" aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="course-card-grid" role="status" aria-label="Loading course cards">
          {sections.map((item) => (
            <div
              className="course-nav-card course-nav-card--loading"
              key={item.id}
              aria-hidden="true"
            >
              <span className="course-card-skeleton course-card-skeleton--count" />
              <span className="course-card-skeleton course-card-skeleton--title" />
              <span className="course-card-skeleton course-card-skeleton--description" />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
