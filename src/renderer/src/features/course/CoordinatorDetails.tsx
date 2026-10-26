import { useEffect, useRef, useState } from 'react'
import type { DataTableRef } from 'datatables.net-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNotifications } from '../notifications/Notifications'
import FullScreenLoader from '../shell/FullScreenLoader'
import { useSmoothLoading } from '../shell/useSmoothLoading'
import {
  getCoordinator,
  getCoordinatorMembers,
  updateCoordinator,
  updateCoordinatorStatus,
  uploadCoordinatorPhoto,
  type Coordinator,
  type CoordinatorMember
} from './courseApi'
import { DataTable, Column } from './dataTable'
import { resizeColumns } from './resizeColumns'
import { printCoordinatorLabels } from './coordinatorLabels'

export default function CoordinatorDetails({
  coordinatorKey,
  onBack,
  onCandidate,
  onManagePeople
}: {
  coordinatorKey: string
  onBack: () => void
  onCandidate: (key: string) => void
  onManagePeople: (coordinator: Coordinator) => void
}): React.JSX.Element {
  const [coordinator, setCoordinator] = useState<Coordinator | null>(null)
  const [members, setMembers] = useState<CoordinatorMember[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [restoreKeys, setRestoreKeys] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const table = useRef<DataTableRef>(null)
  const notify = useNotifications()
  const { loading, leaving, finish } = useSmoothLoading()
  useEffect(() => {
    let active = true
    Promise.all([getCoordinator(coordinatorKey), getCoordinatorMembers(coordinatorKey)])
      .then(([details, people]) => {
        if (active) {
          setCoordinator(details)
          setMembers(people)
        }
      })
      .catch((reason) => {
        if (active)
          setError(reason instanceof Error ? reason.message : 'Could not load coordinator')
      })
      .finally(() => {
        if (active) finish()
      })
    return () => {
      active = false
    }
  }, [coordinatorKey, finish])
  async function save(): Promise<void> {
    if (!coordinator) return
    setSaving(true)
    try {
      const saved = await updateCoordinator(coordinatorKey, {
        name: coordinator.name,
        phone: coordinator.phone,
        email: coordinator.email,
        address_line1: coordinator.address_line1,
        address_line2: coordinator.address_line2,
        address_line3: coordinator.address_line3,
        address: [
          coordinator.address_line1,
          coordinator.address_line2,
          coordinator.address_line3,
          coordinator.district,
          coordinator.state,
          coordinator.postal_code
        ]
          .filter(Boolean)
          .join(', '),
        district: coordinator.district,
        state: coordinator.state,
        postal_code: coordinator.postal_code
      })
      setCoordinator(saved)
      notify.success('Coordinator updated')
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not update coordinator')
    } finally {
      setSaving(false)
    }
  }
  async function changePhoto(file: File): Promise<void> {
    setSaving(true)
    try {
      setCoordinator(await uploadCoordinatorPhoto(coordinatorKey, file))
      notify.success('Coordinator photo updated')
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not upload photo')
    } finally {
      setSaving(false)
    }
  }
  async function changeStatus(status: Coordinator['status']): Promise<void> {
    if (!coordinator) return
    if (status !== 'ACTIVE' && !window.confirm(
      `${status === 'SUSPENDED' ? 'Discontinue' : 'Drop out'} C-${coordinator.number} and everyone under this coordinator?`
    )) return
    setSaving(true)
    try {
      const result = await updateCoordinatorStatus(
        coordinatorKey, status, status === 'ACTIVE' ? [...restoreKeys] : []
      )
      const [details, people] = await Promise.all([
        getCoordinator(coordinatorKey), getCoordinatorMembers(coordinatorKey)
      ])
      setCoordinator(details)
      setMembers(people)
      setRestoreOpen(false)
      setRestoreKeys(new Set())
      notify.success(`${status === 'ACTIVE' ? 'Coordinator restored' : status === 'SUSPENDED' ? 'Coordinator discontinued' : 'Coordinator dropped out'} · ${result.candidates_changed} candidates updated`)
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not change coordinator status')
    } finally {
      setSaving(false)
    }
  }
  const restorable = [
    ...(coordinator?.enrollment_key && coordinator.enrollment_status !== 'ACTIVE' ? [{
      enrollment_key: coordinator.enrollment_key,
      bbs_number: coordinator.bbs_number,
      name: coordinator.name,
      status: coordinator.enrollment_status || ''
    }] : []),
    ...members.filter((member) => member.status !== 'ACTIVE')
  ]
  return (
    <section className="page course-page">
      <div className="course-toolbar">
        <Button variant="outline" onClick={onBack}>
          ← Coordinators
        </Button>
        <h1>{coordinator ? `C-${coordinator.number} ${coordinator.name}` : 'Coordinator'}</h1>
        <span>{coordinator?.status === 'SUSPENDED' ? 'Discontinued' : coordinator?.status === 'DROPOUT' ? 'Dropout' : 'Active'} · {coordinator?.member_count ?? 0} people</span>
        <Button
          variant="outline"
          disabled={!coordinator}
          onClick={() => coordinator && printCoordinatorLabels([coordinator])}
        >
          Print address
        </Button>
      </div>
      {error && <p className="course-error">{error}</p>}
      {coordinator && (
        <div className="candidate-form coordinator-editor">
          <div className="candidate-form__readonly">
            <span>Country: {coordinator.country}</span>
            <span>Status: {coordinator.status === 'SUSPENDED' ? 'Discontinued' : coordinator.status === 'DROPOUT' ? 'Dropout' : 'Active'}</span>
            <span>People: {coordinator.member_count}</span>
            {coordinator.enrollment_key && (
              <Button variant="link" onClick={() => onCandidate(coordinator.enrollment_key!)}>
                View coordinator candidate details · {coordinator.bbs_number}
              </Button>
            )}
          </div>
          <div className="candidate-form__grid">
            {(
              [
                'name',
                'phone',
                'email',
                'address_line1',
                'address_line2',
                'address_line3',
                'district',
                'state',
                'postal_code'
              ] as const
            ).map((key) => (
              <label key={key}>
                {key.replaceAll('_', ' ')}
                <Input
                  value={coordinator[key] ?? ''}
                  onChange={(event) =>
                    setCoordinator({ ...coordinator, [key]: event.target.value })
                  }
                />
              </label>
            ))}
          </div>
          <Button disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save coordinator'}
          </Button>
          <aside className="candidate-photo">
            {coordinator.photo_url ? (
              <img src={coordinator.photo_url} alt={`${coordinator.name} profile`} />
            ) : (
              <div className="candidate-photo__empty">No coordinator photo</div>
            )}
            <label className="candidate-photo__upload">
              Change photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={saving}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void changePhoto(file)
                }}
              />
            </label>
          </aside>
        </div>
      )}
      <div className="course-list-actions">
        {coordinator?.status === 'ACTIVE' ? <>
          <Button variant="outline" disabled={saving} onClick={() => void changeStatus('SUSPENDED')}>Discontinue coordinator</Button>
          <Button variant="outline" disabled={saving} onClick={() => void changeStatus('DROPOUT')}>Dropout coordinator</Button>
        </> : coordinator && <Button variant="outline" disabled={saving} onClick={() => setRestoreOpen(true)}>Restore coordinator</Button>}
        <Button
          variant="outline"
          disabled={!coordinator || coordinator.status !== 'ACTIVE'}
          onClick={() => coordinator && onManagePeople(coordinator)}
        >
          Add people
        </Button>
        <label className="course-list-search">
          Search
          <input
            type="search"
            value={search}
            placeholder="Search people"
            onChange={(event) => {
              setSearch(event.target.value)
              table.current?.dt()?.search(event.target.value).draw()
            }}
          />
        </label>
      </div>
      {restoreOpen && coordinator && <div className="candidate-form">
        <h2>Restore C-{coordinator.number} {coordinator.name}</h2>
        <p>Choose which candidates to restore to Active. Unchecked candidates keep their current status.</p>
        {restorable.map((candidate) => <label key={candidate.enrollment_key}>
          <input
            type="checkbox"
            checked={restoreKeys.has(candidate.enrollment_key)}
            onChange={(event) => setRestoreKeys((current) => {
              const next = new Set(current)
              if (event.target.checked) next.add(candidate.enrollment_key)
              else next.delete(candidate.enrollment_key)
              return next
            })}
          /> {candidate.bbs_number} {candidate.name} · {candidate.status}
        </label>)}
        {!restorable.length && <p>No discontinued or dropout candidates to restore.</p>}
        <div className="course-inline-actions">
          <Button disabled={saving} onClick={() => void changeStatus('ACTIVE')}>Restore selected</Button>
          <Button variant="outline" disabled={saving} onClick={() => setRestoreOpen(false)}>Cancel</Button>
        </div>
      </div>}
      <div className="course-table-wrap" onPointerDown={resizeColumns}>
        <DataTable
          ref={table}
          data={members}
          className="display course-table"
          options={{
            pageLength: 20,
            lengthChange: false,
            paging: true,
            searching: true,
            info: true,
            autoWidth: false,
            order: [],
            layout: { topStart: null, topEnd: null, bottomStart: 'info', bottomEnd: 'paging' }
          }}
        >
          <Column title="BBS number" data="bbs_number">
            {(_value, _type, row: CoordinatorMember) => (
              <button className="course-link" onClick={() => onCandidate(row.enrollment_key)}>
                {row.bbs_number}
              </button>
            )}
          </Column>
          <Column title="Name" data="name" />
          <Column title="Status" data="status" />
          <Column title="Phone" data="phone" />
          <Column title="Address" data="address" />
        </DataTable>
      </div>
      {loading && <FullScreenLoader message="Loading coordinator" leaving={leaving} />}
    </section>
  )
}
