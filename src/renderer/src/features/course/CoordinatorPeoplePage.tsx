import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FullScreenLoader from '../shell/FullScreenLoader'
import { useNotifications } from '../notifications/Notifications'
import {
  getAllCandidates,
  getCoordinatorMembers,
  setCoordinatorMembers,
  type Candidate,
  type Coordinator
} from './courseApi'

export default function CoordinatorPeoplePage({
  coordinator,
  onBack,
  onSaved
}: {
  coordinator: Coordinator
  onBack: () => void
  onSaved: () => void
}): React.JSX.Element {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const notify = useNotifications()

  useEffect(() => {
    let active = true
    Promise.all([
      getAllCandidates(coordinator.country, 'OFFLINE', 'ACTIVE'),
      getCoordinatorMembers(coordinator.coordinator_key)
    ])
      .then(([people, members]) => {
        if (!active) return
        setCandidates(
          people.filter((person) => person.enrollment_key !== coordinator.enrollment_key)
        )
        setSelected(new Set(members.map((member) => member.enrollment_key)))
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load candidates')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [coordinator.coordinator_key, coordinator.country, coordinator.enrollment_key])

  const visible = candidates.filter((candidate) =>
    `${candidate.bbs_identifier} ${candidate.full_name} ${candidate.district} ${candidate.state} ${candidate.phone}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  )

  async function save(): Promise<void> {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      await setCoordinatorMembers(coordinator.coordinator_key, [...selected])
      notify.success('Coordinator people updated')
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update people')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page course-page">
      <div className="course-toolbar">
        <Button variant="outline" onClick={onBack}>
          ← Coordinators
        </Button>
        <h1>Add people · {coordinator.name}</h1>
        <span>{selected.size} selected</span>
      </div>
      <div className="course-list-actions">
        <label className="course-list-search">
          Search
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, BBS number, district, state, or phone"
          />
        </label>
        <Button disabled={loading || saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save people'}
        </Button>
      </div>
      <p>
        Each selected person receives a separate parcel. Candidates without an address use this
        coordinator’s address.
      </p>
      {error && <p className="course-error">{error}</p>}
      <div className="course-people-grid">
        {visible.map((candidate) => (
          <label className="course-book-option" key={candidate.enrollment_key}>
            <input
              type="checkbox"
              checked={selected.has(candidate.enrollment_key)}
              disabled={saving}
              onChange={(event) =>
                setSelected((current) => {
                  const next = new Set(current)
                  if (event.target.checked) next.add(candidate.enrollment_key)
                  else next.delete(candidate.enrollment_key)
                  return next
                })
              }
            />
            <span>
              <strong>
                {candidate.bbs_identifier} · {candidate.full_name}
              </strong>
              <small>
                {[candidate.district, candidate.state, candidate.phone].filter(Boolean).join(' · ')}
              </small>
            </span>
          </label>
        ))}
      </div>
      {!loading && !visible.length && <p>No candidates match this search.</p>}
      {loading && <FullScreenLoader message="Loading candidates" />}
    </section>
  )
}
