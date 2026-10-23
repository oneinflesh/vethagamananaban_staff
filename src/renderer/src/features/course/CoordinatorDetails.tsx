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
  return (
    <section className="page course-page">
      <div className="course-toolbar">
        <Button variant="outline" onClick={onBack}>
          ← Coordinators
        </Button>
        <h1>{coordinator?.name || 'Coordinator'}</h1>
        <span>{coordinator?.member_count ?? 0} people</span>
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
        <Button
          variant="outline"
          disabled={!coordinator}
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
          <Column title="Phone" data="phone" />
          <Column title="Address" data="address" />
        </DataTable>
      </div>
      {loading && <FullScreenLoader message="Loading coordinator" leaving={leaving} />}
    </section>
  )
}
