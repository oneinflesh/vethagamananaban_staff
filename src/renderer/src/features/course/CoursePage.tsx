import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCountry } from '../country/CountryContext'
import CandidateList from './CandidateList'
import CandidateDetails from './CandidateDetails'
import CoordinatorDetails from './CoordinatorDetails'
import CoordinatorCreatePage from './CoordinatorCreatePage'
import CoordinatorPeoplePage from './CoordinatorPeoplePage'
import CoordinatorList from './CoordinatorList'
import ManualRegistrationPage from './ManualRegistrationPage'
import MonthlyDispatchPage from './MonthlyDispatchPage'
import SendReleasedBooksPage from './SendReleasedBooksPage'
import CourseBooksPage from './CourseBooksPage'
import WholeResultsPage from './WholeResultsPage'
import CourseLanguagesPage from './CourseLanguagesPage'
import CurrentCurriculumPage from './CurrentCurriculumPage'
import CoursePaymentsPage from './CoursePaymentsPage'
import PreviousBalancePage from './PreviousBalancePage'
import CoordinatorPaymentsPage from './CoordinatorPaymentsPage'
import {
  getCandidateCounts,
  getCoordinatorCount,
  type Candidate,
  type CandidateCounts,
  type Coordinator
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
  const [creatingCoordinator, setCreatingCoordinator] = useState(false)
  const [peopleCoordinator, setPeopleCoordinator] = useState<Coordinator | null>(null)
  const [coordinatorRefresh, setCoordinatorRefresh] = useState(0)
  const [manualRegistration, setManualRegistration] = useState(false)
  const [monthlyDispatch, setMonthlyDispatch] = useState(false)
  const [courseBooks, setCourseBooks] = useState(false)
  const [wholeResults, setWholeResults] = useState(false)
  const [courseLanguages, setCourseLanguages] = useState(false)
  const [currentCurriculum, setCurrentCurriculum] = useState(false)
  const [coursePayments, setCoursePayments] = useState(false)
  const [previousBalances, setPreviousBalances] = useState(false)
  const [coordinatorPayments, setCoordinatorPayments] = useState(false)
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
      creatingCoordinator ||
      peopleCoordinator ||
      manualRegistration ||
      monthlyDispatch ||
      courseBooks ||
      wholeResults ||
      courseLanguages ||
      currentCurriculum ||
      coursePayments ||
      previousBalances ||
      coordinatorPayments ||
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
    creatingCoordinator,
    peopleCoordinator,
    manualRegistration,
    monthlyDispatch,
    courseBooks,
    wholeResults,
    courseLanguages,
    currentCurriculum,
    coursePayments,
    previousBalances,
    coordinatorPayments,
    bookCandidate,
    retry
  ])
  const visibleCounts = counts?.country === country ? counts.values : null
  const peoplePage = peopleCoordinator && (
    <CoordinatorPeoplePage
      key={peopleCoordinator.coordinator_key}
      coordinator={peopleCoordinator}
      onBack={() => setPeopleCoordinator(null)}
      onSaved={() => {
        setPeopleCoordinator(null)
        setCoordinatorRefresh((value) => value + 1)
      }}
    />
  )
  if (peoplePage && !section) return peoplePage
  if (creatingCoordinator)
    return (
      <CoordinatorCreatePage
        country={country}
        onBack={() => setCreatingCoordinator(false)}
        onCreated={(key) => {
          setCreatingCoordinator(false)
          setCoordinatorKey(key)
          setCounts(null)
        }}
      />
    )
  if (section)
    return (
      <>
        <div
          className={
            bookCandidate || candidateKey || coordinatorKey || peopleCoordinator
              ? 'course-list-host course-list-host--hidden'
              : 'course-list-host'
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
        {peoplePage ||
          (coordinatorKey ? (
            <CoordinatorDetails
              key={`${coordinatorKey}:${coordinatorRefresh}`}
              coordinatorKey={coordinatorKey}
              onBack={() => setCoordinatorKey(null)}
              onManagePeople={setPeopleCoordinator}
              onCandidate={(key) => {
                setCoordinatorKey(null)
                setCandidateKey(key)
              }}
            />
          ) : candidateKey ? (
            <CandidateDetails
              key={candidateKey}
              candidateKey={candidateKey}
              initialTab={candidateTab}
              onBack={() => setCandidateKey(null)}
              onCoordinator={setCoordinatorKey}
            />
          ) : bookCandidate ? (
            <SendReleasedBooksPage
              key={bookCandidate.enrollment_key}
              candidate={bookCandidate}
              onBack={() => setBookCandidate(null)}
            />
          ) : null)}
      </>
    )
  if (coordinatorKey)
    return (
      <CoordinatorDetails
        key={`${coordinatorKey}:${coordinatorRefresh}`}
        coordinatorKey={coordinatorKey}
        onBack={() => setCoordinatorKey(null)}
        onManagePeople={setPeopleCoordinator}
        onCandidate={(key) => {
          setCoordinatorKey(null)
          setCandidateKey(key)
        }}
      />
    )
  if (candidateKey && !monthlyDispatch && !coursePayments && !previousBalances && !coordinatorPayments)
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
        onCreate={() => setCreatingCoordinator(true)}
        onManagePeople={setPeopleCoordinator}
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
  if (courseBooks) return <CourseBooksPage country={country} onBack={() => setCourseBooks(false)} />
  if (wholeResults)
    return <WholeResultsPage country={country} onBack={() => setWholeResults(false)} />
  if (courseLanguages) return <CourseLanguagesPage onBack={() => setCourseLanguages(false)} />
  if (currentCurriculum) return <CurrentCurriculumPage country={country} onBack={() => setCurrentCurriculum(false)} />
  if (previousBalances)
    return (
      <>
        <div className={candidateKey ? 'course-list-host course-list-host--hidden' : 'course-list-host'}>
          <PreviousBalancePage country={country} onBack={() => setPreviousBalances(false)} onCandidate={(key) => { setCandidateTab('details'); setCandidateKey(key) }} />
        </div>
        {candidateKey && <CandidateDetails key={candidateKey} candidateKey={candidateKey} initialTab={candidateTab} onBack={() => setCandidateKey(null)} onCoordinator={setCoordinatorKey} />}
      </>
    )
  if (coordinatorPayments)
    return <>
      <div className={candidateKey ? 'course-list-host course-list-host--hidden' : 'course-list-host'}>
        <CoordinatorPaymentsPage country={country} onBack={() => setCoordinatorPayments(false)}
          onCoordinator={setCoordinatorKey}
          onCandidate={(key) => { setCandidateTab('details'); setCandidateKey(key) }} />
      </div>
      {candidateKey && <CandidateDetails key={candidateKey} candidateKey={candidateKey}
        initialTab={candidateTab} onBack={() => setCandidateKey(null)} onCoordinator={setCoordinatorKey} />}
    </>
  if (coursePayments)
    return (
      <>
        <div className={candidateKey ? 'course-list-host course-list-host--hidden' : 'course-list-host'}>
          <CoursePaymentsPage
            country={country}
            onBack={() => setCoursePayments(false)}
            onCandidate={(key) => { setCandidateTab('details'); setCandidateKey(key) }}
            onPreviousBalances={() => setPreviousBalances(true)}
            onCoordinatorPayments={() => setCoordinatorPayments(true)}
          />
        </div>
        {candidateKey && (
          <CandidateDetails
            key={candidateKey}
            candidateKey={candidateKey}
            initialTab={candidateTab}
            onBack={() => setCandidateKey(null)}
            onCoordinator={setCoordinatorKey}
          />
        )}
      </>
    )
  if (monthlyDispatch)
    return (
      <>
        <div
          className={
            candidateKey ? 'course-list-host course-list-host--hidden' : 'course-list-host'
          }
        >
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
        </div>
        {candidateKey && (
          <CandidateDetails
            key={candidateKey}
            candidateKey={candidateKey}
            initialTab={candidateTab}
            onBack={() => setCandidateKey(null)}
            onCoordinator={setCoordinatorKey}
          />
        )}
      </>
    )
  return (
    <section className="page course-page">
      <div className="course-heading">
        <h1>Course</h1>
        <span>{country}</span>
        <Button className="course-new-registration" onClick={() => setManualRegistration(true)}>
          New manual registration
        </Button>
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
        <div className="course-card-grid course-card-grid--candidates">
          {sections.slice(0, 6).map((item) => (
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
        <div
          className="course-card-grid course-card-grid--candidates"
          role="status"
          aria-label="Loading course cards"
        >
          {sections.slice(0, 7).map((item) => (
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
          <button className="course-nav-card" onClick={() => setMonthlyDispatch(true)}>
            <strong>Monthly book dispatch</strong>
            <small>Open month, ship books, view unpaid candidates, and print addresses</small>
            <span className="course-nav-card__arrow" aria-hidden="true">
              →
            </span>
          </button>
          <button className="course-nav-card" onClick={() => setCourseBooks(true)}>
            <strong>Course books</strong>
            <small>Edit shared book details, stock, and language-specific content</small>
            <span className="course-nav-card__arrow" aria-hidden="true">
              →
            </span>
          </button>
          <button className="course-nav-card" onClick={() => setWholeResults(true)}>
            <strong>Results</strong>
            <small>View and edit whole-course marks</small>
            <span className="course-nav-card__arrow" aria-hidden="true">
              →
            </span>
          </button>
          <button className="course-nav-card" onClick={() => setCourseLanguages(true)}>
            <strong>Language and Country</strong>
            <small>Create languages and choose available countries</small>
            <span className="course-nav-card__arrow" aria-hidden="true">
              →
            </span>
          </button>
          <button className="course-nav-card" onClick={() => setCurrentCurriculum(true)}>
            <strong>Current Month Curriculum</strong>
            <small>Active month and question readiness by language</small>
            <span className="course-nav-card__arrow" aria-hidden="true">
              →
            </span>
          </button>
          <button className="course-nav-card" onClick={() => setCoursePayments(true)}>
            <strong>Payments</strong>
            <small>Wallet payments and Vethagama Nanban credit</small>
            <span className="course-nav-card__arrow" aria-hidden="true">→</span>
          </button>
        </div>
      )}
    </section>
  )
}
