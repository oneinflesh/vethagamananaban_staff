import { useEffect, useState } from 'react'
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
  const [countError, setCountError] = useState(false)
  useEffect(() => {
    if (section || candidateKey || coordinatorKey) return
    let active = true
    getCandidateCounts(country)
      .then((result) => {
        if (active) {
          setCounts({ country, values: result })
          setCountError(false)
        }
      })
      .catch(() => {
        if (active) setCountError(true)
      })
    return () => {
      active = false
    }
  }, [country, section, candidateKey, coordinatorKey])
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
        onBack={() => setSection(null)}
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
      {countError && <p className="course-error">Could not load candidate counts.</p>}
      <div className="course-card-grid">
        {sections.map((item, index) => (
          <button className="course-nav-card" key={item.id} onClick={() => setSection(item.id)}>
            <span className="course-nav-card__number">{String(index + 1).padStart(2, '0')}</span>
            <span className="course-nav-card__count">
              {counts?.country === country ? counts.values[item.id] : '—'}
            </span>
            <strong>{item.title}</strong>
            <small>{item.description}</small>
            <span className="course-nav-card__arrow" aria-hidden="true">
              →
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
