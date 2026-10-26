import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { DataTableRef } from 'datatables.net-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNotifications } from '../notifications/Notifications'
import FullScreenLoader from '../shell/FullScreenLoader'
import { useSmoothLoading } from '../shell/useSmoothLoading'
import {
  getCoordinator,
  getCoordinatorMemberPage,
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
  const [memberCount, setMemberCount] = useState(0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [restoreKeys, setRestoreKeys] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const table = useRef<DataTableRef>(null)
  const tableWrap = useRef<HTMLDivElement>(null)
  const tableReady = useRef(false)
  const restoreKeysRef = useRef(restoreKeys)
  const query = useRef({ coordinatorKey, search, restoreOpen })
  useLayoutEffect(() => {
    query.current = { coordinatorKey, search, restoreOpen }
  }, [coordinatorKey, search, restoreOpen])
  const notify = useNotifications()
  const { loading, leaving, finish } = useSmoothLoading()
  useEffect(() => {
    let active = true
    getCoordinator(coordinatorKey)
      .then((details) => {
        if (active) {
          setCoordinator(details)
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
  useEffect(() => {
    if (!tableReady.current) {
      tableReady.current = true
      return
    }
    const timer = window.setTimeout(() => table.current?.dt()?.ajax.reload(), search ? 300 : 0)
    return () => window.clearTimeout(timer)
  }, [coordinatorKey, search, restoreOpen])
  useEffect(() => {
    restoreKeysRef.current = restoreKeys
    syncVisibleRestoreCheckboxes()
  }, [restoreKeys, members])
  function syncVisibleRestoreCheckboxes(): void {
    tableWrap.current
      ?.querySelectorAll<HTMLInputElement>('input[data-restore-key]')
      .forEach((input) => {
        input.checked = restoreKeysRef.current.has(input.dataset.restoreKey ?? '')
      })
  }
  function toggleRestoreKey(key: string, checked: boolean): void {
    setRestoreKeys((current) => {
      const next = new Set(current)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }
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
    if (status === 'ACTIVE' && coordinator.status === 'ACTIVE' && !restoreKeys.size) return
    if (
      status !== 'ACTIVE' &&
      !window.confirm(
        `${status === 'SUSPENDED' ? 'Discontinue' : 'Drop out'} C-${coordinator.number} and everyone under this coordinator?`
      )
    )
      return
    setSaving(true)
    try {
      const result = await updateCoordinatorStatus(
        coordinatorKey,
        status,
        status === 'ACTIVE' ? [...restoreKeys] : []
      )
      setCoordinator(await getCoordinator(coordinatorKey))
      table.current?.dt()?.ajax.reload(undefined, false)
      setRestoreOpen(false)
      setRestoreKeys(new Set())
      notify.success(
        `${
          status === 'ACTIVE'
            ? coordinator.status === 'ACTIVE'
              ? 'Selected people restored'
              : 'Coordinator restored'
            : status === 'SUSPENDED'
              ? 'Coordinator discontinued'
              : 'Coordinator dropped out'
        } · ${result.candidates_changed} candidates updated`
      )
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not change coordinator status')
    } finally {
      setSaving(false)
    }
  }
  const restorableCoordinator =
    coordinator?.enrollment_key && coordinator.enrollment_status !== 'ACTIVE' ? coordinator : null
  return (
    <section className="page course-page">
      <div className="course-toolbar">
        <Button variant="outline" onClick={onBack}>
          ← Coordinators
        </Button>
        <h1>{coordinator ? `C-${coordinator.number} ${coordinator.name}` : 'Coordinator'}</h1>
        <span className="coordinator-header-meta">
          {coordinator?.status === 'SUSPENDED'
            ? 'Discontinued'
            : coordinator?.status === 'DROPOUT'
              ? 'Dropout'
              : 'Active'}{' '}
          · {coordinator?.member_count ?? 0} people
        </span>
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
        <div className="coordinator-detail-layout">
          <div className="candidate-form coordinator-editor">
            <div className="coordinator-section-heading">
              <div>
                <h2>Coordinator details</h2>
                <p>
                  Country {coordinator.country} · C-{coordinator.number}
                </p>
              </div>
              <Button disabled={saving} onClick={() => void save()}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
            <h3>Contact</h3>
            <div className="candidate-form__grid">
              {(['name', 'phone', 'email'] as const).map((key) => (
                <label key={key}>
                  {key === 'name' ? 'Name' : key === 'phone' ? 'Phone' : 'Email'}
                  <Input
                    value={coordinator[key] ?? ''}
                    onChange={(event) =>
                      setCoordinator({ ...coordinator, [key]: event.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <h3>Delivery address</h3>
            <div className="candidate-form__grid">
              {(
                [
                  'address_line1',
                  'address_line2',
                  'address_line3',
                  'district',
                  'state',
                  'postal_code'
                ] as const
              ).map((key) => (
                <label key={key}>
                  {key === 'postal_code' ? 'Pincode' : key.replaceAll('_', ' ')}
                  <Input
                    value={coordinator[key] ?? ''}
                    onChange={(event) =>
                      setCoordinator({ ...coordinator, [key]: event.target.value })
                    }
                  />
                </label>
              ))}
            </div>
          </div>
          <aside className="candidate-photo coordinator-profile">
            <h2>Photo</h2>
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
            {coordinator.enrollment_key && (
              <Button variant="outline" onClick={() => onCandidate(coordinator.enrollment_key!)}>
                View candidate · {coordinator.bbs_number}
              </Button>
            )}
            {coordinator.status === 'ACTIVE' && restorableCoordinator && (
              <label className="coordinator-self-restore">
                <input
                  type="checkbox"
                  checked={restoreKeys.has(restorableCoordinator.enrollment_key!)}
                  onChange={(event) =>
                    toggleRestoreKey(restorableCoordinator.enrollment_key!, event.target.checked)
                  }
                />
                Restore {restorableCoordinator.bbs_number} to Active
              </label>
            )}
          </aside>
        </div>
      )}
      <div className="coordinator-people-heading">
        <div>
          <h2>People under coordinator</h2>
          <p>{coordinator?.member_count ?? 0} people assigned</p>
        </div>
      </div>
      <div className="course-list-actions coordinator-people-actions">
        {coordinator?.status === 'ACTIVE' ? (
          <>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => void changeStatus('SUSPENDED')}
            >
              Discontinue coordinator
            </Button>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => void changeStatus('DROPOUT')}
            >
              Dropout coordinator
            </Button>
          </>
        ) : (
          coordinator && (
            <Button variant="outline" disabled={saving} onClick={() => setRestoreOpen(true)}>
              Restore coordinator
            </Button>
          )
        )}
        {coordinator?.status === 'ACTIVE' && (
          <Button
            variant="outline"
            disabled={saving || restoreKeys.size === 0}
            onClick={() => void changeStatus('ACTIVE')}
          >
            Restore selected ({restoreKeys.size})
          </Button>
        )}
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
            }}
          />
        </label>
      </div>
      {restoreOpen && coordinator && (
        <div className="candidate-form">
          <h2>
            Restore C-{coordinator.number} {coordinator.name}
          </h2>
          <p>
            Choose which candidates to restore to Active. Unchecked candidates keep their current
            status.
          </p>
          {restorableCoordinator && (
            <label>
              <input
                type="checkbox"
                checked={restoreKeys.has(restorableCoordinator.enrollment_key!)}
                onChange={(event) =>
                  toggleRestoreKey(restorableCoordinator.enrollment_key!, event.target.checked)
                }
              />{' '}
              {restorableCoordinator.bbs_number} {restorableCoordinator.name} ·{' '}
              {restorableCoordinator.enrollment_status}
            </label>
          )}
          <p>
            Members available on the table below: {memberCount}. Select their checkboxes across
            pages.
          </p>
          {!restorableCoordinator && !memberCount && (
            <p>No discontinued or dropout candidates to restore.</p>
          )}
          <div className="course-inline-actions">
            <Button disabled={saving} onClick={() => void changeStatus('ACTIVE')}>
              Restore selected
            </Button>
            <Button variant="outline" disabled={saving} onClick={() => setRestoreOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      <div className="course-table-wrap" ref={tableWrap} onPointerDown={resizeColumns}>
        <DataTable
          ref={table}
          className="display course-table"
          options={{
            pageLength: 20,
            serverSide: true,
            processing: true,
            ajax: (request, callback) => {
              const current = query.current
              void getCoordinatorMemberPage(
                current.coordinatorKey,
                Math.floor((request.start ?? 0) / (request.length || 20)) + 1,
                current.search,
                current.restoreOpen
              )
                .then((page) => {
                  setMembers(page.results)
                  setMemberCount(page.count)
                  setError('')
                  finish()
                  callback({
                    draw: request.draw,
                    recordsTotal: page.count,
                    recordsFiltered: page.count,
                    data: page.results
                  })
                })
                .catch((reason) => {
                  setError(
                    reason instanceof Error ? reason.message : 'Could not load coordinator people'
                  )
                  finish()
                  callback({ draw: request.draw, recordsTotal: 0, recordsFiltered: 0, data: [] })
                })
            },
            lengthChange: false,
            paging: true,
            searching: true,
            info: true,
            autoWidth: false,
            order: [],
            rowId: 'enrollment_key',
            drawCallback: () => window.setTimeout(syncVisibleRestoreCheckboxes, 0),
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
          <Column
            title="Restore"
            data="enrollment_key"
            options={{ orderable: false, searchable: false }}
          >
            {(_value, _type, row: CoordinatorMember) =>
              row.status !== 'ACTIVE' ? (
                <input
                  type="checkbox"
                  aria-label={`Restore ${row.name}`}
                  data-restore-key={row.enrollment_key}
                  defaultChecked={false}
                  onChange={(event) => toggleRestoreKey(row.enrollment_key, event.target.checked)}
                />
              ) : (
                ''
              )
            }
          </Column>
        </DataTable>
      </div>
      {loading && <FullScreenLoader message="Loading coordinator" leaving={leaving} />}
    </section>
  )
}
