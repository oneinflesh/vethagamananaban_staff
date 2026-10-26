import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
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
  updateCoordinatorMemberStatus,
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
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [selectedStatuses, setSelectedStatuses] = useState<
    Map<string, CoordinatorMember['status']>
  >(new Map())
  const [search, setSearch] = useState('')
  const [menu, setMenu] = useState<{ x: number; y: number; person: CoordinatorMember } | null>(null)
  const table = useRef<DataTableRef>(null)
  const tableWrap = useRef<HTMLDivElement>(null)
  const tableReady = useRef(false)
  const selectedKeysRef = useRef(selectedKeys)
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
    selectedKeysRef.current = selectedKeys
    syncVisibleSelection()
  }, [selectedKeys, members])
  function syncVisibleSelection(): void {
    tableWrap.current
      ?.querySelectorAll<HTMLInputElement>('input[data-person-key]')
      .forEach((input) => {
        input.checked = selectedKeysRef.current.has(input.dataset.personKey ?? '')
      })
  }
  function toggleSelectedKey(key: string, checked: boolean): void {
    setSelectedKeys((current) => {
      const next = new Set(current)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
    setSelectedStatuses((current) => {
      const next = new Map(current)
      if (checked) {
        const status =
          members.find((item) => item.enrollment_key === key)?.status ??
          (coordinator?.enrollment_key === key ? coordinator.enrollment_status : undefined)
        if (status) next.set(key, status)
      } else next.delete(key)
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
    if (status === 'ACTIVE' && coordinator.status === 'ACTIVE' && !selectedKeys.size) return
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
        status === 'ACTIVE' ? [...selectedKeys] : []
      )
      setCoordinator(await getCoordinator(coordinatorKey))
      table.current?.dt()?.ajax.reload(undefined, false)
      setRestoreOpen(false)
      setSelectedKeys(new Set())
      setSelectedStatuses(new Map())
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
  async function changePeopleStatus(status: 'ACTIVE' | 'SUSPENDED', keys: string[]): Promise<void> {
    if (!coordinator || coordinator.status !== 'ACTIVE' || !keys.length) return
    if (
      status === 'SUSPENDED' &&
      !window.confirm(`Discontinue ${keys.length} selected person${keys.length === 1 ? '' : 's'}?`)
    )
      return
    setSaving(true)
    setMenu(null)
    try {
      const result = await updateCoordinatorMemberStatus(coordinatorKey, status, keys)
      const changedKeys = new Set(keys)
      setSelectedKeys((current) => new Set([...current].filter((key) => !changedKeys.has(key))))
      setSelectedStatuses((current) => {
        const next = new Map(current)
        changedKeys.forEach((key) => next.delete(key))
        return next
      })
      setCoordinator(await getCoordinator(coordinatorKey))
      table.current?.dt()?.ajax.reload(undefined, false)
      notify.success(
        `${result.candidates_changed} ${result.candidates_changed === 1 ? 'person' : 'people'} ${status === 'ACTIVE' ? 'restored' : 'discontinued'}`
      )
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not update selected people')
    } finally {
      setSaving(false)
    }
  }
  function openPersonMenu(event: MouseEvent<HTMLDivElement>): void {
    const row = (event.target as HTMLElement).closest('tr')
    const person = members.find((item) => item.enrollment_key === row?.id)
    if (!person) return
    event.preventDefault()
    setMenu({
      x: Math.min(event.clientX, window.innerWidth - 230),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 180)),
      person
    })
  }
  function toggleVisibleSelection(): void {
    const visible = members.map((item) => item.enrollment_key)
    if (!visible.length) return
    const allSelected = visible.every((key) => selectedKeys.has(key))
    setSelectedKeys((current) => {
      const next = new Set(current)
      visible.forEach((key) => {
        if (allSelected) next.delete(key)
        else next.add(key)
      })
      return next
    })
    setSelectedStatuses((current) => {
      const next = new Map(current)
      members.forEach((item) => {
        if (allSelected) next.delete(item.enrollment_key)
        else next.set(item.enrollment_key, item.status)
      })
      return next
    })
  }
  const restorableCoordinator =
    coordinator?.enrollment_key && coordinator.enrollment_status !== 'ACTIVE' ? coordinator : null
  const activeSelectedKeys = [...selectedKeys].filter(
    (key) => selectedStatuses.get(key) === 'ACTIVE'
  )
  const restorableSelectedKeys = [...selectedKeys].filter((key) => {
    const status = selectedStatuses.get(key)
    return Boolean(status && status !== 'ACTIVE')
  })
  return (
    <section className="page course-page" onClick={() => menu && setMenu(null)}>
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
                  checked={selectedKeys.has(restorableCoordinator.enrollment_key!)}
                  onChange={(event) =>
                    toggleSelectedKey(restorableCoordinator.enrollment_key!, event.target.checked)
                  }
                />
                Restore {restorableCoordinator.bbs_number} to Active
              </label>
            )}
          </aside>
        </div>
      )}
      <div className="coordinator-status-actions">
        <span>Coordinator status</span>
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
      </div>
      <div className="coordinator-people-heading">
        <div>
          <h2>People under coordinator</h2>
        </div>
      </div>
      {coordinator && (
        <div className="coordinator-member-summary" aria-label="Coordinator people by status">
          <div>
            <strong>{coordinator.member_count}</strong>
            <span>Assigned</span>
          </div>
          <div>
            <strong>{coordinator.active_member_count}</strong>
            <span>Active</span>
          </div>
          <div>
            <strong>{coordinator.discontinued_member_count}</strong>
            <span>Discontinued</span>
          </div>
          <div>
            <strong>{coordinator.dropout_member_count}</strong>
            <span>Dropout</span>
          </div>
        </div>
      )}
      <div className="course-list-actions coordinator-people-actions">
        <Button variant="outline" disabled={!members.length} onClick={toggleVisibleSelection}>
          {members.length && members.every((item) => selectedKeys.has(item.enrollment_key))
            ? 'Deselect visible'
            : 'Select visible'}
        </Button>
        {selectedKeys.size > 0 && (
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => {
              setSelectedKeys(new Set())
              setSelectedStatuses(new Map())
            }}
          >
            Clear selection
          </Button>
        )}
        {coordinator?.status === 'ACTIVE' && (
          <>
            {activeSelectedKeys.length > 0 && (
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => void changePeopleStatus('SUSPENDED', activeSelectedKeys)}
              >
                Discontinue selected ({activeSelectedKeys.length})
              </Button>
            )}
            {restorableSelectedKeys.length > 0 && (
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => void changePeopleStatus('ACTIVE', restorableSelectedKeys)}
              >
                Restore selected ({restorableSelectedKeys.length})
              </Button>
            )}
          </>
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
                checked={selectedKeys.has(restorableCoordinator.enrollment_key!)}
                onChange={(event) =>
                  toggleSelectedKey(restorableCoordinator.enrollment_key!, event.target.checked)
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
      <div
        className="course-table-wrap"
        ref={tableWrap}
        onPointerDown={resizeColumns}
        onContextMenu={openPersonMenu}
      >
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
            drawCallback: () => window.setTimeout(syncVisibleSelection, 0),
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
            title="Select"
            data="enrollment_key"
            options={{ orderable: false, searchable: false }}
          >
            {(_value, _type, row: CoordinatorMember) => (
              <input
                type="checkbox"
                aria-label={`Select ${row.name}`}
                data-person-key={row.enrollment_key}
                defaultChecked={false}
                onChange={(event) => toggleSelectedKey(row.enrollment_key, event.target.checked)}
              />
            )}
          </Column>
        </DataTable>
      </div>
      {menu && (
        <div
          className="course-context-menu course-context-menu--actions coordinator-person-menu"
          style={{ left: menu.x, top: menu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <span>
            {menu.person.bbs_number} · {menu.person.name}
          </span>
          <button
            type="button"
            onClick={() => {
              onCandidate(menu.person.enrollment_key)
              setMenu(null)
            }}
          >
            View candidate
          </button>
          {coordinator?.status === 'ACTIVE' && (
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                void changePeopleStatus(menu.person.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE', [
                  menu.person.enrollment_key
                ])
              }
            >
              {menu.person.status === 'ACTIVE' ? 'Discontinue' : 'Restore'}
            </button>
          )}
        </div>
      )}
      {loading && <FullScreenLoader message="Loading coordinator" leaving={leaving} />}
    </section>
  )
}
