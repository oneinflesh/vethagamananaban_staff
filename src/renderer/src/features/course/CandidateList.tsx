import { useEffect, useState, type MouseEvent, type PointerEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FullScreenLoader from '../shell/FullScreenLoader'
import { useSmoothLoading } from '../shell/useSmoothLoading'
import { getCandidates, type Candidate, type CandidatePage } from './courseApi'
import { DataTable, Column } from './dataTable'
import type { CourseSection } from './CoursePage'

const names: Record<CourseSection, string> = {
  all: 'All candidates',
  online: 'Online candidates',
  offline: 'Offline candidates',
  discontinued: 'Discontinued candidates',
  finished: 'Course finished candidates'
}
const pageSize = 20

export default function CandidateList({
  section,
  country,
  onBack,
  onCandidate,
  onCoordinator
}: {
  section: CourseSection
  country: string
  onBack: () => void
  onCandidate: (key: string) => void
  onCoordinator: (key: string) => void
}): React.JSX.Element {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [data, setData] = useState<CandidatePage | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [menu, setMenu] = useState<{ x: number; y: number; candidate: Candidate } | null>(null)
  const { loading, leaving, start, finish } = useSmoothLoading()
  const mode = section === 'online' ? 'ONLINE' : section === 'offline' ? 'OFFLINE' : ''
  const status =
    section === 'discontinued' ? 'SUSPENDED' : section === 'finished' ? 'COMPLETED' : ''

  useEffect(() => {
    let active = true
    getCandidates(country, page, mode, status, query)
      .then((value) => {
        if (active) {
          setData(value)
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
  }, [country, page, mode, status, query, retry, finish])

  function openMenu(event: MouseEvent<HTMLDivElement>): void {
    const row = (event.target as HTMLElement).closest('tr')
    const candidate = data?.results.find((item) => item.enrollment_key === row?.id)
    if (!candidate) return
    event.preventDefault()
    setMenu({
      x: Math.min(event.clientX, window.innerWidth - 140),
      y: Math.min(event.clientY, window.innerHeight - 55),
      candidate
    })
  }

  function resizeColumn(event: PointerEvent<HTMLDivElement>): void {
    const header = (event.target as HTMLElement).closest('th')
    const table = header?.closest('table')
    if (!header || !table || header.getBoundingClientRect().right - event.clientX > 12) return
    event.preventDefault()
    const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th'))
    const columns = Array.from(table.querySelectorAll<HTMLTableColElement>('colgroup col'))
    const widths = headers.map((item) => item.getBoundingClientRect().width)
    headers.forEach((item, index) => {
      item.style.width = `${widths[index]}px`
      item.style.minWidth = '70px'
    })
    columns.forEach((item, index) => {
      item.style.width = `${widths[index]}px`
    })
    const index = headers.indexOf(header)
    const startX = event.clientX
    const initialWidth = widths[index]
    const initialTableWidth = widths.reduce((sum, width) => sum + width, 0)
    const move = (pointer: globalThis.PointerEvent): void => {
      const width = Math.max(70, initialWidth + pointer.clientX - startX)
      header.style.width = `${width}px`
      if (columns[index]) columns[index].style.width = `${width}px`
      table.style.setProperty('width', `${initialTableWidth + width - initialWidth}px`, 'important')
    }
    const stop = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop, { once: true })
  }

  return (
    <section className="page course-page" onClick={() => menu && setMenu(null)}>
      <div className="course-toolbar">
        <Button variant="outline" onClick={onBack}>
          ← Course
        </Button>
        <h1>{names[section]}</h1>
        <span>
          {country} · {data?.count ?? 0} candidates
        </span>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            start()
            setPage(1)
            setQuery(search)
            setRetry((value) => value + 1)
          }}
        >
          <Input
            aria-label="Search candidates"
            placeholder="Search name, BBS, phone…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button type="submit">Search</Button>
        </form>
      </div>
      {error && (
        <div className="course-error">
          {error}{' '}
          <Button
            variant="link"
            onClick={() => {
              start()
              setRetry((value) => value + 1)
            }}
          >
            Retry
          </Button>
        </div>
      )}
      <div
        className="course-table-wrap course-table-wrap--candidates"
        onContextMenu={openMenu}
        onPointerDown={resizeColumn}
      >
        <DataTable
          data={data?.results ?? []}
          className="display course-table"
          options={{
            paging: false,
            searching: false,
            info: false,
            autoWidth: false,
            order: [],
            rowId: 'enrollment_key'
          }}
        >
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
          <Column title="Address 3" data="address_line3" />
          <Column title="District" data="district" />
          <Column title="State" data="state" />
          <Column title="Pincode" data="postal_code" />
          <Column title="Phone 1" data="phone" />
          <Column title="Phone 2" data="phone2" />
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
        </DataTable>
      </div>
      <div className="course-pagination">
        <span>
          {data && data.count > 0
            ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, data.count)} of ${data.count}`
            : '0 candidates'}
        </span>
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => {
            start()
            setPage(page - 1)
          }}
        >
          Previous
        </Button>
        <span>
          Page {page} of {Math.max(1, Math.ceil((data?.count ?? 0) / pageSize))}
        </span>
        <Button
          variant="outline"
          disabled={!data || page * pageSize >= data.count}
          onClick={() => {
            start()
            setPage(page + 1)
          }}
        >
          Next
        </Button>
      </div>
      {menu && (
        <button
          className="course-context-menu"
          style={{ left: menu.x, top: menu.y }}
          onClick={(event) => {
            event.stopPropagation()
            onCandidate(menu.candidate.enrollment_key)
          }}
        >
          Edit candidate
        </button>
      )}
      {loading && <FullScreenLoader message="Loading candidates" leaving={leaving} />}
    </section>
  )
}
