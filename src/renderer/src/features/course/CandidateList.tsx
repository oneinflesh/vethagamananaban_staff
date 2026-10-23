import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react'
import type { DataTableRef } from 'datatables.net-react'
import { Button } from '@/components/ui/button'
import FullScreenLoader from '../shell/FullScreenLoader'
import { useSmoothLoading } from '../shell/useSmoothLoading'
import { useNotifications } from '../notifications/Notifications'
import { candidateAction, getAllCandidates, getInitialDispatch, type Candidate } from './courseApi'
import { DataTable, Column } from './dataTable'
import { resizeColumns } from './resizeColumns'
import CandidateActionPanel, { type CandidateAction } from './CandidateActionPanel'
import type { CourseSection } from './CoursePage'
import { exportAddressCsv, printAddressLabels } from './addressLabels'

const names: Record<CourseSection, string> = {
  all: 'All candidates',
  online: 'Online candidates',
  offline: 'Offline candidates',
  discontinued: 'Discontinued candidates',
  finished: 'Course finished candidates',
  newOffline: 'New Registrations - Offline'
}

export default function CandidateList({
  section,
  country,
  onBack,
  onCandidate,
  onCoordinator,
  onMarks
}: {
  section: CourseSection
  country: string
  onBack: () => void
  onCandidate: (key: string) => void
  onCoordinator: (key: string) => void
  onMarks: (key: string) => void
}): React.JSX.Element {
  const [data, setData] = useState<Candidate[] | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [date, setDate] = useState('')
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [visibleKeys, setVisibleKeys] = useState<string[]>([])
  const [shipping, setShipping] = useState(false)
  const [menu, setMenu] = useState<{ x: number; y: number; candidate: Candidate } | null>(null)
  const [action, setAction] = useState<{ kind: CandidateAction; candidate: Candidate } | null>(null)
  const table = useRef<DataTableRef>(null)
  const tableWrap = useRef<HTMLDivElement>(null)
  const { loading, leaving, start, finish } = useSmoothLoading()
  const notify = useNotifications()
  useEffect(() => {
    tableWrap.current
      ?.querySelectorAll<HTMLInputElement>('input[data-candidate-key]')
      .forEach((input) => {
        input.checked = selected.has(input.dataset.candidateKey ?? '')
      })
  }, [selected, visibleKeys])
  const newOffline = section === 'newOffline'
  const addressActions = section === 'offline' || newOffline
  const mode =
    section === 'online' ? 'ONLINE' : section === 'offline' || newOffline ? 'OFFLINE' : ''
  const status =
    section === 'discontinued' ? 'SUSPENDED' : section === 'finished' ? 'COMPLETED' : ''

  useEffect(() => {
    let active = true
    getAllCandidates(country, mode, status, newOffline, date)
      .then((records) => {
        if (active) {
          setData(records)
          setError('')
        }
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load candidates')
      })
      .finally(() => {
        if (active) finish()
      })
    return () => {
      active = false
    }
  }, [country, mode, status, newOffline, date, retry, finish])

  function refresh(): void {
    setData(null)
    setSelected(new Set())
    start()
    setRetry((value) => value + 1)
  }

  function openMenu(event: MouseEvent<HTMLDivElement>): void {
    const row = (event.target as HTMLElement).closest('tr')
    const candidate = data?.find((item) => item.enrollment_key === row?.id)
    if (!candidate) return
    event.preventDefault()
    setMenu({
      x: Math.min(event.clientX, window.innerWidth - 230),
      y: Math.min(event.clientY, window.innerHeight - 270),
      candidate
    })
  }

  function visibleSelection(): void {
    if (!visibleKeys.length) return
    setSelected((current) => {
      const next = new Set(current)
      const allSelected = visibleKeys.every((key) => next.has(key))
      visibleKeys.forEach((key) => {
        if (allSelected) next.delete(key)
        else next.add(key)
      })
      return next
    })
  }

  function selectionChange(event: ChangeEvent<HTMLDivElement>): void {
    const target = event.target as HTMLInputElement
    if (!target.matches('input[data-candidate-key]')) return
    const key = target.dataset.candidateKey
    if (!key) return
    setSelected((current) => {
      const next = new Set(current)
      if (target.checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  async function shipSelected(): Promise<void> {
    if (
      !selected.size ||
      !window.confirm(
        `Mark the current book and ID card shipped for ${selected.size} selected candidates?`
      )
    )
      return
    setShipping(true)
    let shipped = 0
    const failures: string[] = []
    for (const candidate of (data ?? []).filter((item) => selected.has(item.enrollment_key))) {
      try {
        const dispatch = await getInitialDispatch(candidate.enrollment_key)
        if (!dispatch.wallet_funded)
          throw new Error(
            'This candidate has an older paid-book record; open the candidate to dispatch it.'
          )
        const current = dispatch.items[0]
        if (!current) throw new Error('No current book is released.')
        if (!current.dispatched || !dispatch.id_card_dispatched) {
          await candidateAction('initial-dispatch', candidate.enrollment_key, {
            include_id_card: !dispatch.id_card_dispatched,
            allocation_keys: current.dispatched ? [] : [current.allocation_key]
          })
        }
        shipped += 1
      } catch (cause) {
        failures.push(
          `${candidate.bbs_identifier}: ${cause instanceof Error ? cause.message : 'Could not ship'}`
        )
      }
    }
    setShipping(false)
    if (shipped)
      notify.success(`${shipped} candidate parcel${shipped === 1 ? '' : 's'} marked shipped`)
    if (failures.length)
      notify.error(
        failures.slice(0, 3).join('; ') +
          (failures.length > 3 ? `; and ${failures.length - 3} more` : '')
      )
    refresh()
  }

  const printable = newOffline
    ? (data ?? []).filter((candidate) => selected.has(candidate.enrollment_key))
    : (data ?? [])

  return (
    <section className="page course-page" onClick={() => menu && setMenu(null)}>
      <div className="course-toolbar">
        <Button variant="outline" onClick={onBack}>
          ← Course
        </Button>
        <h1>{names[section]}</h1>
        <span>
          {country} · {data?.length ?? 0} candidates
        </span>
        {newOffline && (
          <label className="course-date-filter">
            Registration date
            <input
              type="date"
              value={date}
              onChange={(event) => {
                start()
                setData(null)
                setSelected(new Set())
                setDate(event.target.value)
              }}
            />
          </label>
        )}
        {newOffline && (
          <Button variant="outline" onClick={visibleSelection} disabled={!visibleKeys.length}>
            {visibleKeys.length && visibleKeys.every((key) => selected.has(key))
              ? 'Deselect all'
              : 'Select all visible'}
          </Button>
        )}
        {newOffline && (
          <Button
            variant="outline"
            disabled={!selected.size || shipping}
            onClick={() => void shipSelected()}
          >
            {shipping ? 'Shipping…' : 'Mark selected shipped'}
          </Button>
        )}
        {addressActions && (
          <>
            <Button
              variant="outline"
              disabled={!printable.length}
              onClick={() => exportAddressCsv(printable)}
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              disabled={!printable.length}
              onClick={() => printAddressLabels(printable, newOffline)}
            >
              Print labels
            </Button>
          </>
        )}
        <Button variant="outline" onClick={refresh}>
          Refresh
        </Button>
      </div>
      {error && (
        <div className="course-error">
          {error}{' '}
          <Button variant="link" onClick={refresh}>
            Retry
          </Button>
        </div>
      )}
      {newOffline && (
        <p className="course-selection-note">
          {selected.size} selected for printing or export. Select candidates across pages; only
          selected candidates appear in the output.
        </p>
      )}
      <div
        ref={tableWrap}
        className="course-table-wrap course-table-wrap--candidates"
        onContextMenu={openMenu}
        onPointerDown={resizeColumns}
        onChange={selectionChange}
      >
        <DataTable
          ref={table}
          data={data ?? []}
          className="display course-table"
          options={{
            pageLength: 20,
            lengthChange: false,
            searching: true,
            paging: true,
            info: true,
            autoWidth: false,
            order: [],
            rowId: 'enrollment_key',
            drawCallback: function () {
              const rows = this.api()
                .rows({ page: 'current', search: 'applied' })
                .data()
                .toArray() as Candidate[]
              setVisibleKeys(rows.map((row) => row.enrollment_key))
            },
            layout: {
              topStart: null,
              topEnd: 'search',
              bottomStart: 'info',
              bottomEnd: 'paging'
            }
          }}
        >
          {newOffline && (
            <Column
              title="Select"
              data="enrollment_key"
              options={{ orderable: false, searchable: false }}
            >
              {(_value, _type, row: Candidate) => (
                <input
                  type="checkbox"
                  aria-label={`Select ${row.full_name}`}
                  data-candidate-key={row.enrollment_key}
                  defaultChecked={false}
                />
              )}
            </Column>
          )}
          <Column title="BBS number" data="bbs_identifier">
            {(_value, _type, row: Candidate) => (
              <button className="course-link" onClick={() => onCandidate(row.enrollment_key)}>
                {row.bbs_identifier || '—'}
              </button>
            )}
          </Column>
          <Column title="Name" data="full_name" />
          <Column title="Address 1" data="address_line1" />
          <Column title="Address 2" data="address_line2" />
          <Column title="Address 3" data="address_line3" options={{ defaultContent: '' }} />
          <Column title="District" data="district" />
          <Column title="State" data="state" />
          <Column title="Pincode" data="postal_code" />
          <Column title="Phone 1" data="phone" />
          <Column title="Phone 2" data="phone2" options={{ defaultContent: '' }} />
          <Column title="Coordinator" data="coordinator.name" options={{ defaultContent: '' }}>
            {(_value, _type, row: Candidate) =>
              row.coordinator ? (
                <button
                  className="course-link"
                  onClick={() => onCoordinator(row.coordinator!.coordinator_key)}
                >
                  {row.coordinator.name}
                </button>
              ) : (
                '—'
              )
            }
          </Column>
          {newOffline && <Column title="Initial parcel" data="initial_dispatch_status" />}
        </DataTable>
      </div>
      {menu && (
        <div
          className="course-context-menu course-context-menu--actions"
          style={{ left: menu.x, top: menu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            onClick={() => {
              onCandidate(menu.candidate.enrollment_key)
              setMenu(null)
            }}
          >
            View / update candidate
          </button>
          {menu.candidate.mode === 'OFFLINE' && (
            <>
              <button
                onClick={() => {
                  setAction({ kind: 'parcel', candidate: menu.candidate })
                  setMenu(null)
                }}
              >
                Prepare ID card and books
              </button>
              <button
                onClick={() => {
                  setAction({ kind: 'payment', candidate: menu.candidate })
                  setMenu(null)
                }}
              >
                Record offline payment
              </button>
              <button
                onClick={() => {
                  onMarks(menu.candidate.enrollment_key)
                  setMenu(null)
                }}
              >
                View / edit marks
              </button>
            </>
          )}
          <button
            onClick={() => {
              setAction({ kind: 'password', candidate: menu.candidate })
              setMenu(null)
            }}
          >
            Change password
          </button>
          {menu.candidate.status === 'SUSPENDED' ? (
            <button
              onClick={() => {
                setAction({ kind: 'restore', candidate: menu.candidate })
                setMenu(null)
              }}
            >
              Restore candidate
            </button>
          ) : (
            <button
              onClick={() => {
                setAction({ kind: 'discontinue', candidate: menu.candidate })
                setMenu(null)
              }}
            >
              Discontinue candidate
            </button>
          )}
        </div>
      )}
      {action && (
        <CandidateActionPanel
          action={action.kind}
          candidate={action.candidate}
          onClose={() => setAction(null)}
          onChanged={() => {
            setAction(null)
            refresh()
          }}
        />
      )}
      {(loading || shipping) && (
        <FullScreenLoader
          message={shipping ? 'Shipping selected parcels' : 'Loading candidates'}
          leaving={loading && leaving}
        />
      )}
    </section>
  )
}
