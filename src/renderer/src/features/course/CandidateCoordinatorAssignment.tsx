import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNotifications } from '../notifications/Notifications'
import {
  getCoordinatorPage,
  setCandidateCoordinator,
  type CandidateSummary,
  type Coordinator
} from './courseApi'

export default function CandidateCoordinatorAssignment({
  candidateKey,
  summary,
  onUpdated,
  onCoordinator
}: {
  candidateKey: string
  summary: CandidateSummary
  onUpdated: () => Promise<void>
  onCoordinator: (key: string) => void
}): React.JSX.Element | null {
  const [kind, setKind] = useState<'INDIVIDUAL' | 'COORDINATOR'>(
    summary.coordinator ? 'COORDINATOR' : 'INDIVIDUAL'
  )
  const [coordinatorKey, setCoordinatorKey] = useState(summary.coordinator?.coordinator_key ?? '')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Coordinator[]>([])
  const [saving, setSaving] = useState(false)
  const [searchError, setSearchError] = useState('')
  const notify = useNotifications()

  useEffect(() => {
    if (kind !== 'COORDINATOR' || !search.trim()) {
      return
    }
    let active = true
    const timer = window.setTimeout(() => {
      getCoordinatorPage(summary.candidate.country, 1, {
        search: search.trim(),
        status: 'ACTIVE'
      })
        .then((page) => {
          if (active) {
            setResults(page.results)
            setSearchError('')
          }
        })
        .catch((cause) => {
          if (active)
            setSearchError(cause instanceof Error ? cause.message : 'Could not search coordinators')
        })
    }, 300)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [kind, search, summary.candidate.country])

  if (summary.candidate.mode !== 'OFFLINE') return null
  if (summary.candidate_role === 'COORDINATOR')
    return (
      <div className="candidate-assignment">
        <h2>Registration type</h2>
        <p>This candidate is a coordinator. Manage their people from the coordinator page.</p>
      </div>
    )

  const originalKey = summary.coordinator?.coordinator_key ?? ''
  const selectedKey = kind === 'INDIVIDUAL' ? '' : coordinatorKey
  const changed = selectedKey !== originalKey
  const selectedCoordinator = results.find((item) => item.coordinator_key === coordinatorKey)

  async function save(): Promise<void> {
    if (kind === 'COORDINATOR' && !coordinatorKey) {
      notify.error('Select an active coordinator.')
      return
    }
    setSaving(true)
    try {
      await setCandidateCoordinator(candidateKey, kind === 'INDIVIDUAL' ? '' : coordinatorKey)
      await onUpdated()
      notify.success(kind === 'INDIVIDUAL' ? 'Changed to individual' : 'Coordinator updated')
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not update coordinator')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="candidate-assignment">
      <h2>Registration type</h2>
      <div className="candidate-assignment__fields">
        <label>
          Type
          <select
            value={kind}
            onChange={(event) => {
              const next = event.target.value as 'INDIVIDUAL' | 'COORDINATOR'
              setKind(next)
              setCoordinatorKey(next === 'COORDINATOR' ? originalKey : '')
            }}
          >
            <option value="INDIVIDUAL">Individual</option>
            <option value="COORDINATOR">Under coordinator</option>
          </select>
        </label>
        {kind === 'COORDINATOR' && (
          <>
            <label>
              Search coordinator
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name or C-number"
              />
            </label>
            <label>
              Active coordinator
              <select
                value={coordinatorKey}
                onChange={(event) => setCoordinatorKey(event.target.value)}
              >
                <option value="">Select a coordinator</option>
                {originalKey && !selectedCoordinator && (
                  <option value={originalKey}>{summary.coordinator?.name} (current)</option>
                )}
                {results.map((item) => (
                  <option key={item.coordinator_key} value={item.coordinator_key}>
                    {item.name} C-{item.number}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>
      {searchError && <p className="course-error">{searchError}</p>}
      {kind === 'INDIVIDUAL' && changed && (
        <p>Phone and Address 1 must be saved before changing to Individual.</p>
      )}
      <div className="course-inline-actions">
        <Button disabled={saving || !changed} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save registration type'}
        </Button>
        {originalKey && (
          <Button variant="link" onClick={() => onCoordinator(originalKey)}>
            View current coordinator
          </Button>
        )}
      </div>
    </div>
  )
}
