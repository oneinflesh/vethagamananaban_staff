import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { DataTableRef } from 'datatables.net-react'
import { Button } from '@/components/ui/button'
import FullScreenLoader from '../shell/FullScreenLoader'
import { useSmoothLoading } from '../shell/useSmoothLoading'
import { getAllCandidates, type Candidate } from './courseApi'
import { DataTable, Column } from './dataTable'
import { resizeColumns } from './resizeColumns'
import CandidateActionPanel, { type CandidateAction } from './CandidateActionPanel'
import type { CourseSection } from './CoursePage'

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
  const selectedRef = useRef<Set<string>>(new Set())
  const [menu, setMenu] = useState<{ x: number; y: number; candidate: Candidate } | null>(null)
  const [action, setAction] = useState<{ kind: CandidateAction; candidate: Candidate } | null>(null)
  const table = useRef<DataTableRef>(null)
  const { loading, leaving, start, finish } = useSmoothLoading()
  useEffect(() => {
    selectedRef.current = selected
    table.current?.dt()?.rows().invalidate().draw(false)
  }, [selected])
  const newOffline = section === 'newOffline'
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
    const rows = table.current
      ?.dt()
      ?.rows({ page: 'current', search: 'applied' })
      .data()
      .toArray() as Candidate[] | undefined
    if (!rows) return
    setSelected((current) => {
      const next = new Set(current)
      const allSelected = rows.every((row) => next.has(row.enrollment_key))
      rows.forEach((row) => {
        if (allSelected) next.delete(row.enrollment_key)
        else next.add(row.enrollment_key)
      })
      return next
    })
  }

  const exportOptions = newOffline
    ? {
        rows: (_index: number, row: Candidate): boolean =>
          selectedRef.current.has(row.enrollment_key),
        columns: ':visible:not(:first-child)',
        modifier: { search: 'none' as const, page: 'all' as const }
      }
    : { columns: ':visible', modifier: { search: 'none' as const, page: 'all' as const } }

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
          <Button variant="outline" onClick={visibleSelection}>
            Select all visible
          </Button>
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
          {selected.size} selected for printing or export. Print and CSV use only selected
          candidates; other lists include everyone.
        </p>
      )}
      <div
        className="course-table-wrap course-table-wrap--candidates"
        onContextMenu={openMenu}
        onPointerDown={resizeColumns}
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
            buttons: [
              { extend: 'copyHtml5', exportOptions },
              { extend: 'csvHtml5', text: 'Export CSV', exportOptions },
              { extend: 'print', exportOptions }
            ],
            layout: {
              topStart: 'buttons',
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
                  checked={selected.has(row.enrollment_key)}
                  onChange={(event) => {
                    const checked = event.target.checked
                    setSelected((current) => {
                      const next = new Set(current)
                      if (checked) next.add(row.enrollment_key)
                      else next.delete(row.enrollment_key)
                      return next
                    })
                  }}
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
      {loading && <FullScreenLoader message="Loading candidates" leaving={leaving} />}
    </section>
  )
}
