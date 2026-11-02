import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNotifications } from '../notifications/Notifications'
import {
  getCandidates,
  getCoordinatorPage,
  getCoordinatorMembers,
  type Candidate,
  type Coordinator,
  type CoordinatorMember
} from './courseApi'
import SendReleasedBooksPage from './SendReleasedBooksPage'

export default function ManualBookDispatchPage({
  country,
  onBack
}: {
  country: string
  onBack: () => void
}): React.JSX.Element {
  const [recipientType, setRecipientType] = useState<'individual' | 'coordinator'>('individual')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [coordinators, setCoordinators] = useState<Coordinator[]>([])
  const [members, setMembers] = useState<CoordinatorMember[]>([])
  const [coordinator, setCoordinator] = useState<Coordinator | null>(null)
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const notify = useNotifications()

  useEffect(() => {
    if (coordinator || candidate) return
    let active = true
    setLoading(true)
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
    setLoading(true)
    getCoordinatorMembers(coordinator.coordinator_key).then((result) => {
      if (active) setMembers(result.filter((member) => member.status === 'ACTIVE'))
    }).catch((error) => {
      if (active) notify.error(error instanceof Error ? error.message : 'Could not load people')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [coordinator, notify])

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
      <Button variant="outline" onClick={coordinator ? () => setCoordinator(null) : onBack}>← Course</Button>
      <h1>Send released books</h1>
    </div>
    {coordinator ? <>
      <h2>{coordinator.name} · C-{coordinator.number}</h2>
      <div className="course-manual-dispatch-list">
        {members.map((member) => <button key={member.enrollment_key} onClick={() => {
          setCandidate({ enrollment_key: member.enrollment_key, full_name: member.name,
            bbs_identifier: member.bbs_number, wallet_balance: '0' } as Candidate)
        }}>{member.bbs_number} · {member.name}</button>)}
        {!loading && members.length === 0 && <p>No active people under this coordinator.</p>}
      </div>
    </> : <>
      <div className="course-manual-dispatch-controls">
        <label>Send to <select value={recipientType} onChange={(event) => {
          setRecipientType(event.target.value as 'individual' | 'coordinator')
          setPage(1)
          setSearch('')
        }}><option value="individual">Individual</option><option value="coordinator">Coordinator</option></select></label>
        <Input aria-label="Search recipients" placeholder="Search name or number" value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1) }} />
      </div>
      <div className="course-manual-dispatch-list">
        {recipientType === 'individual'
          ? candidates.map((person) =>
            <button key={person.enrollment_key} onClick={() => setCandidate(person)}>
              {person.bbs_identifier} · {person.full_name}
            </button>)
          : coordinators.map((person) => <button key={person.coordinator_key}
            onClick={() => setCoordinator(person)}>C-{person.number} · {person.name}</button>)}
      </div>
      <div className="course-manual-dispatch-pages">
        <Button variant="outline" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Previous</Button>
        <span>Page {page} · {total} recipients</span>
        <Button variant="outline" disabled={page * 20 >= total || loading} onClick={() => setPage(page + 1)}>Next</Button>
      </div>
    </>}
    {loading && <p role="status">Loading…</p>}
  </section>
}
