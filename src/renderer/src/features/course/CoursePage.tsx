import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCountry } from '../country/CountryContext'
import CandidateList from './CandidateList'
import CandidateDetails from './CandidateDetails'
import CoordinatorDetails from './CoordinatorDetails'
import CoordinatorList from './CoordinatorList'
import ManualRegistrationPage from './ManualRegistrationPage'
import MonthlyDispatchPage from './MonthlyDispatchPage'
import SendReleasedBooksPage from './SendReleasedBooksPage'
import {
  getCandidateCounts,
  getCoordinatorCount,
  type Candidate,
  type CandidateCounts
} from './courseApi'
import './course.css'

export type CourseSection =
  'all' | 'online' | 'offline' | 'discontinued' | 'dropout' | 'finished' | 'newOffline'
const sections: { id: CourseSection; title: string; description: string }[] = [
  { id: 'all', title: 'All candidates', description: 'Every course registration' },
  { id: 'online', title: 'Online candidates', description: 'Online study mode' },
  { id: 'offline', title: 'Offline candidates', description: 'Postal study mode' },
  { id: 'discontinued', title: 'Discontinued candidates', description: 'Suspended registrations' },
  { id: 'finished', title: 'Course finished candidates', description: 'Completed courses' },
  { id: 'dropout', title: 'Dropout candidates', description: 'Candidates who left the course' },
  { id: 'newOffline', title: 'New Registrations - Offline', description: 'Pending initial parcel' }
]
export default function CoursePage(): React.JSX.Element {
  const { country } = useCountry()
  const [section, setSection] = useState<CourseSection | null>(null)
  const [candidateKey, setCandidateKey] = useState<string | null>(null)
  const [candidateTab, setCandidateTab] = useState<'details' | 'exams'>('details')
  const [coordinatorKey, setCoordinatorKey] = useState<string | null>(null)
  const [coordinatorList, setCoordinatorList] = useState(false)
  const [manualRegistration, setManualRegistration] = useState(false)
  const [monthlyDispatch, setMonthlyDispatch] = useState(false)
  const [bookCandidate, setBookCandidate] = useState<Candidate | null>(null)
  const [counts, setCounts] = useState<{
    country: string
    values: CandidateCounts & { coordinators: number }
  } | null>(null)
  const [countError, setCountError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (
      section ||
      candidateKey ||
      coordinatorKey ||
      coordinatorList ||
      manualRegistration ||
      monthlyDispatch ||
      bookCandidate
    )
      return
    let active = true
    Promise.all([
      Promise.all([getCandidateCounts(country), getCoordinatorCount(country)]),
      new Promise<void>((resolve) => window.setTimeout(resolve, 400))
    ])
      .then(([[result, coordinators]]) => {
        if (active) {
          setCounts({ country, values: { ...result, coordinators } })
          setCountError(null)
        }
      })
      .catch(() => {
        if (active) setCountError(country)
      })
    return () => {
      active = false
    }
  }, [
    country,
    section,
    candidateKey,
    coordinatorKey,
    coordinatorList,
    manualRegistration,
    monthlyDispatch,
    bookCandidate,
    retry
  ])
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
        initialTab={candidateTab}
        onBack={() => setCandidateKey(null)}
        onCoordinator={setCoordinatorKey}
      />
    )
  if (coordinatorList)
    return (
      <CoordinatorList
        country={country}
        onBack={() => {
          setCoordinatorList(false)
          setCounts(null)
        }}
        onCoordinator={setCoordinatorKey}
      />
    )
  if (manualRegistration)
    return (
      <ManualRegistrationPage
        country={country}
        onBack={() => {
          setManualRegistration(false)
          setCounts(null)
        }}
        onCandidate={(key) => {
          setManualRegistration(false)
          setCounts(null)
          setCandidateTab('details')
          setCandidateKey(key)
        }}
      />
    )
  if (monthlyDispatch)
    return (
      <MonthlyDispatchPage
        country={country}
        onBack={() => {
          setMonthlyDispatch(false)
          setCounts(null)
        }}
        onCandidate={(key) => {
          setCandidateTab('details')
          setCandidateKey(key)
        }}
      />
    )
  if (section)
    return (
      <>
        <div
          className={
            bookCandidate ? 'course-list-host course-list-host--hidden' : 'course-list-host'
          }
        >
          <CandidateList
            key={`${section}:${country}`}
            section={section}
            country={country}
            onBack={() => {
              setCounts(null)
              setSection(null)
            }}
            onCandidate={(key) => {
              setCandidateTab('details')
              setCandidateKey(key)
            }}
            onMarks={(key) => {
              setCandidateTab('exams')
              setCandidateKey(key)
            }}
            onCoordinator={setCoordinatorKey}
            onSendReleasedBooks={setBookCandidate}
          />
        </div>
        {bookCandidate && (
          <SendReleasedBooksPage
            key={bookCandidate.enrollment_key}
            candidate={bookCandidate}
            onBack={() => setBookCandidate(null)}
          />
        )}
      </>
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
          {sections.slice(0, 5).map((item) => (
            <button className="course-nav-card" key={item.id} onClick={() => setSection(item.id)}>
              <span className="course-nav-card__count">{visibleCounts[item.id]}</span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
              <span className="course-nav-card__arrow" aria-hidden="true">
                →
              </span>
            </button>
          ))}
          <button className="course-nav-card" onClick={() => setCoordinatorList(true)}>
            <span className="course-nav-card__count">{visibleCounts.coordinators}</span>
            <strong>Coordinators</strong>
            <small>View coordinators and their people</small>
            <span className="course-nav-card__arrow" aria-hidden="true">
              →
            </span>
          </button>
        </div>
      ) : (
        <div className="course-card-grid" role="status" aria-label="Loading course cards">
          {sections.slice(0, 6).map((item) => (
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
      {visibleCounts && countError !== country && (
        <div className="course-card-grid course-card-grid--second">
          <button
            className="course-nav-card course-nav-card--wide"
            onClick={() => setSection('newOffline')}
          >
            <span className="course-nav-card__count">{visibleCounts.newOffline ?? ''}</span>
            <strong>New Registrations - Offline</strong>
            <small>Pending ID cards and registration books</small>
            <span className="course-nav-card__arrow" aria-hidden="true">
              →
            </span>
          </button>
          <button
            className="course-nav-card course-nav-card--wide"
            onClick={() => setManualRegistration(true)}
          >
            <strong>New manual registration</strong>
            <small>Register an offline candidate and record payment</small>
            <span className="course-nav-card__arrow" aria-hidden="true">
              →
            </span>
          </button>
          <button
            className="course-nav-card course-nav-card--wide"
            onClick={() => setSection('dropout')}
          >
            <span className="course-nav-card__count">{visibleCounts.dropout}</span>
            <strong>Dropout candidates</strong>
            <small>View candidates who left the course</small>
            <span className="course-nav-card__arrow" aria-hidden="true">
              →
            </span>
          </button>
        </div>
      )}
      {visibleCounts && countError !== country && (
        <div className="course-card-grid course-card-grid--third">
          <button
            className="course-nav-card course-nav-card--monthly"
            onClick={() => setMonthlyDispatch(true)}
          >
            <strong>Monthly book dispatch</strong>
            <small>Open month, ship books, view unpaid candidates, and print addresses</small>
            <span className="course-nav-card__arrow" aria-hidden="true">
              →
            </span>
          </button>
        </div>
      )}
    </section>
  )
}
