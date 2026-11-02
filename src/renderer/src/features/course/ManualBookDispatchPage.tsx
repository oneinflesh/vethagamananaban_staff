import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNotifications } from '../notifications/Notifications'
import {
  candidateAction,
  getCandidates,
  getCoordinatorPage,
  getCoordinatorMembers,
  getOtherBookOptions,
  type Candidate,
  type Coordinator,
  type CoordinatorMember,
  type OtherBookOption
} from './courseApi'
import SendReleasedBooksPage from './SendReleasedBooksPage'

export default function ManualBookDispatchPage({
  country,
  recipientType,
  onBack
}: {
  country: string
  recipientType: 'individual' | 'coordinator'
  onBack: () => void
}): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [coordinators, setCoordinators] = useState<Coordinator[]>([])
  const [members, setMembers] = useState<CoordinatorMember[]>([])
  const [coordinator, setCoordinator] = useState<Coordinator | null>(null)
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [books, setBooks] = useState<OtherBookOption[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [selectedBook, setSelectedBook] = useState('')
  const [tracking, setTracking] = useState('')
  const [sending, setSending] = useState(false)
  const notify = useNotifications()

  useEffect(() => {
    if (coordinator || candidate) return
    let active = true
    const request = recipientType === 'individual'
      ? getCandidates(country, page, 'OFFLINE', 'ACTIVE', search, { individualOnly: true })
      : getCoordinatorPage(country, page, { search, status: 'ACTIVE' })
    request.then((result) => {
      if (!active) return
      setTotal(result.count)
      if (recipientType === 'individual') setCandidates(result.results as Candidate[])
      else setCoordinators(result.results as Coordinator[])
    }).catch((error) => {
      if (active) notify.error(error instanceof Error ? error.message : 'Could not load recipients')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [country, recipientType, search, page, coordinator, candidate, notify])

  useEffect(() => {
    if (!coordinator) return
    let active = true
    getCoordinatorMembers(coordinator.coordinator_key).then((result) => {
      if (active) {
        const activeMembers = result.filter((member) => member.status === 'ACTIVE')
        if (coordinator.enrollment_key && coordinator.enrollment_status === 'ACTIVE'
          && !activeMembers.some((member) => member.enrollment_key === coordinator.enrollment_key)) {
          activeMembers.unshift({ enrollment_key: coordinator.enrollment_key,
            bbs_number: coordinator.bbs_number, name: coordinator.name, status: 'ACTIVE',
            phone: coordinator.phone, address: '', sent_books: [], last_marked_exam: null })
        }
        setMembers(activeMembers)
        if (activeMembers.length) {
          getOtherBookOptions(activeMembers[0].enrollment_key).then((options) => {
            if (active) setBooks(options.books.filter((book) => book.active && book.released))
          }).catch((error) => {
            if (active) notify.error(error instanceof Error ? error.message : 'Could not load books')
          })
        }
      }
    }).catch((error) => {
      if (active) notify.error(error instanceof Error ? error.message : 'Could not load people')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [coordinator, notify])

  async function sendToCoordinator(): Promise<void> {
    if (!coordinator || !selectedBook || !selectedMembers.size || !tracking.trim() || sending) return
    setSending(true)
    try {
      const keys = [...selectedMembers]
      const options = await Promise.all(keys.map((key) => getOtherBookOptions(key)))
      const ineligible = keys.filter((_, index) => {
        const book = options[index].books.find((item) => item.exam_key === selectedBook)
        return !book || !book.active || !book.released || book.assigned
      })
      if (ineligible.length) {
        notify.error(`${ineligible.length} selected people cannot receive this book. No books were sent.`)
        return
      }
      let sent = 0
      for (const key of keys) {
        try {
          await candidateAction('other-book-dispatch', key, {
            exam_keys: [selectedBook], tracking_number: tracking.trim()
          })
          sent += 1
        } catch (error) {
          notify.error(`${sent} sent; ${keys.length - sent} not sent. ${error instanceof Error ? error.message : 'Dispatch failed'}`)
          setSelectedMembers(new Set(keys.slice(sent)))
          return
        }
      }
      notify.success(`${sent} books sent under C-${coordinator.number}`)
      setSelectedMembers(new Set())
      setTracking('')
    } finally {
      setSending(false)
    }
  }

  if (candidate) return (
    <SendReleasedBooksPage
      candidate={candidate}
      onBack={() => {
        setCandidate(null)
        setCoordinator(null)
      }}
    />
  )

  return <section className="page course-page">
    <div className="course-toolbar">
      <Button variant="outline" onClick={coordinator ? () => { setCoordinator(null); setSelectedMembers(new Set()) } : onBack}>← Course</Button>
      <h1>{recipientType === 'coordinator' ? 'Send coordinator books' : 'Send individual books'}</h1>
    </div>
    {coordinator ? <>
      <h2>{coordinator.name} · C-{coordinator.number}</h2>
      <div className="course-manual-dispatch-controls">
        <select aria-label="Released book" value={selectedBook} onChange={(event) => setSelectedBook(event.target.value)}>
          <option value="">Choose released book</option>
          {books.map((book) => <option key={book.exam_key} value={book.exam_key}>{book.sequence}. {book.exam_title}</option>)}
        </select>
        <Input aria-label="Tracking number" placeholder="Tracking number" value={tracking}
          onChange={(event) => setTracking(event.target.value)} maxLength={100} />
        <Button disabled={!selectedBook || !selectedMembers.size || !tracking.trim() || sending}
          onClick={() => void sendToCoordinator()}>{sending ? 'Sending…' : `Send to ${selectedMembers.size} selected`}</Button>
      </div>
      <div className="course-manual-dispatch-list">
        {members.map((member) => <label className="course-manual-dispatch-member" key={member.enrollment_key}>
          <input type="checkbox" checked={selectedMembers.has(member.enrollment_key)} disabled={sending}
            onChange={(event) => setSelectedMembers((current) => {
              const next = new Set(current)
              if (event.target.checked) next.add(member.enrollment_key)
              else next.delete(member.enrollment_key)
              return next
            })} />
          {member.bbs_number} · {member.name}
        </label>)}
        {!loading && members.length === 0 && <p>No active people under this coordinator.</p>}
      </div>
    </> : <>
      <div className="course-manual-dispatch-controls">
        <Input aria-label="Search recipients" placeholder="Search name or number" value={search}
          onChange={(event) => { setLoading(true); setSearch(event.target.value); setPage(1) }} />
      </div>
      <div className="course-manual-dispatch-list">
        {recipientType === 'individual'
          ? candidates.map((person) =>
            <button key={person.enrollment_key} onClick={() => setCandidate(person)}>
              {person.bbs_identifier} · {person.full_name}
            </button>)
          : coordinators.map((person) => <button key={person.coordinator_key}
            onClick={() => { setLoading(true); setCoordinator(person) }}>C-{person.number} · {person.name}</button>)}
      </div>
      <div className="course-manual-dispatch-pages">
        <Button variant="outline" disabled={page === 1 || loading} onClick={() => { setLoading(true); setPage(page - 1) }}>Previous</Button>
        <span>Page {page} · {total} recipients</span>
        <Button variant="outline" disabled={page * 20 >= total || loading} onClick={() => { setLoading(true); setPage(page + 1) }}>Next</Button>
      </div>
    </>}
    {loading && <p role="status">Loading…</p>}
  </section>
}
