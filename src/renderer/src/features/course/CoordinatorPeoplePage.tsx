import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FullScreenLoader from '../shell/FullScreenLoader'
import { useNotifications } from '../notifications/Notifications'
import {
  getCoordinatorCandidateOptions,
  updateCoordinatorMembers,
  type CoordinatorCandidateOption,
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
  const [candidates, setCandidates] = useState<CoordinatorCandidateOption[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [changes, setChanges] = useState<Map<string, boolean>>(() => new Map())
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const notify = useNotifications()

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(
      () => {
        getCoordinatorCandidateOptions(coordinator.coordinator_key, search.trim(), page)
          .then((result) => {
            if (!active) return
            setCandidates(result.results)
            setCount(result.count)
            setError('')
          })
          .catch((cause) => {
            if (active)
              setError(cause instanceof Error ? cause.message : 'Could not load candidates')
          })
          .finally(() => {
            if (active) setLoading(false)
          })
      },
      search ? 300 : 0
    )
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [coordinator.coordinator_key, search, page])

  async function save(): Promise<void> {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const additions = [...changes].filter(([, selected]) => selected).map(([key]) => key)
      const removals = [...changes].filter(([, selected]) => !selected).map(([key]) => key)
      if (additions.length || removals.length)
        await updateCoordinatorMembers(coordinator.coordinator_key, additions, removals)
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
        <span>
          {coordinator.member_count +
            [...changes.values()].filter(Boolean).length -
            [...changes.values()].filter((value) => !value).length}{' '}
          selected
        </span>
      </div>
      <div className="course-list-actions">
        <label className="course-list-search">
          Search
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
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
        {candidates.map((candidate) => (
          <label className="course-book-option" key={candidate.enrollment_key}>
            <input
              type="checkbox"
              checked={changes.get(candidate.enrollment_key) ?? candidate.selected}
              disabled={saving}
              onChange={(event) =>
                setChanges((current) => {
                  const next = new Map(current)
                  if (event.target.checked === candidate.selected)
                    next.delete(candidate.enrollment_key)
                  else next.set(candidate.enrollment_key, event.target.checked)
                  return next
                })
              }
            />
            <span>
              <strong>
                {candidate.bbs_number} · {candidate.name}
              </strong>
              <small>
                {[candidate.district, candidate.state, candidate.phone].filter(Boolean).join(' · ')}
              </small>
            </span>
          </label>
        ))}
      </div>
      <div className="course-list-actions">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Previous
        </Button>
        <span>
          Page {page} of {Math.max(1, Math.ceil(count / 20))} · {count} candidates
        </span>
        <Button variant="outline" disabled={page * 20 >= count} onClick={() => setPage(page + 1)}>
          Next
        </Button>
      </div>
      {!loading && !candidates.length && <p>No candidates match this search.</p>}
      {loading && <FullScreenLoader message="Loading candidates" />}
    </section>
  )
}
