import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { DataTableRef } from 'datatables.net-react'
import { Button } from '@/components/ui/button'
import FullScreenLoader from '../shell/FullScreenLoader'
import { useSmoothLoading } from '../shell/useSmoothLoading'
import {
  getCoordinatorFilterOptions,
  getCoordinatorPage,
  getCoordinators,
  type Coordinator,
  type CandidateFilterOptions
} from './courseApi'
import { DataTable, Column } from './dataTable'
import { resizeColumns } from './resizeColumns'
import { statusLabel } from './tableFilters'
import { printCoordinatorLabels } from './coordinatorLabels'
import { printCoordinatorReport } from './coordinatorReport'

export default function CoordinatorList({
  country,
  onBack,
  onCreate,
  onManagePeople,
  onCoordinator
}: {
  country: string
  onBack: () => void
  onCreate: () => void
  onManagePeople: (coordinator: Coordinator) => void
  onCoordinator: (key: string) => void
}): React.JSX.Element {
  const [count, setCount] = useState(0)
  const [filterOptions, setFilterOptions] = useState<CandidateFilterOptions>({
    statuses: [],
    states: [],
    districts: []
  })
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [districtFilter, setDistrictFilter] = useState('')
  const table = useRef<DataTableRef>(null)
  const tableReady = useRef(false)
  const requestSequence = useRef(0)
  const { loading, leaving, finish } = useSmoothLoading()
  const query = useRef({ country, search, statusFilter, stateFilter, districtFilter })
  useLayoutEffect(() => {
    query.current = { country, search, statusFilter, stateFilter, districtFilter }
  }, [country, search, statusFilter, stateFilter, districtFilter])
  useEffect(() => {
    let active = true
    getCoordinatorFilterOptions(country, stateFilter)
      .then((options) => {
        if (active) setFilterOptions(options)
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load filters')
      })
    return () => {
      active = false
    }
  }, [country, stateFilter])
  useEffect(() => {
    if (!tableReady.current) {
      tableReady.current = true
      return
    }
    const timer = window.setTimeout(() => table.current?.dt()?.ajax.reload(), search ? 300 : 0)
    return () => window.clearTimeout(timer)
  }, [country, search, statusFilter, stateFilter, districtFilter])
  useEffect(() => {
    if (retry) table.current?.dt()?.ajax.reload(undefined, false)
  }, [retry])

  async function print(kind: 'report' | 'labels'): Promise<void> {
    setExporting(true)
    try {
      const result = await getCoordinators(country, {
        search,
        status: statusFilter,
        state: stateFilter,
        district: districtFilter
      })
      if (kind === 'report') printCoordinatorReport(result.results, country)
      else printCoordinatorLabels(result.results)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not prepare PDF')
    } finally {
      setExporting(false)
    }
  }
  return (
    <section className="page course-page">
      <div className="course-toolbar">
        <Button variant="outline" onClick={onBack}>
          ← Course
        </Button>
        <h1>Coordinators</h1>
        <span>
          {country} · {count} coordinators
        </span>
        <Button onClick={onCreate}>Create coordinator</Button>
      </div>
      <div className="course-list-actions">
        <Button
          variant="outline"
          disabled={!count || exporting}
          onClick={() => void print('report')}
        >
          PDF coordinator list
        </Button>
        <Button
          variant="outline"
          disabled={!count || exporting}
          onClick={() => void print('labels')}
        >
          Print coordinator addresses
        </Button>
        <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>
          Refresh
        </Button>
        <label className="course-list-filter">
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            {filterOptions.statuses.map((value) => (
              <option key={value} value={value}>
                {statusLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="course-list-filter">
          State
          <select
            value={stateFilter}
            onChange={(event) => {
              setStateFilter(event.target.value)
              setDistrictFilter('')
            }}
          >
            <option value="">All states</option>
            {filterOptions.states.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="course-list-filter">
          District
          <select
            value={districtFilter}
            onChange={(event) => setDistrictFilter(event.target.value)}
          >
            <option value="">All districts</option>
            {filterOptions.districts.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="course-list-search">
          Search
          <input
            type="search"
            value={search}
            placeholder="Search coordinators"
            onChange={(event) => {
              setSearch(event.target.value)
            }}
          />
        </label>
      </div>
      {error && <div className="course-error">{error}</div>}
      <div
        className="course-table-wrap course-table-wrap--candidates"
        onPointerDown={resizeColumns}
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
              const order = request.order?.[0]
              const field = order ? request.columns?.[order.column]?.data : ''
              const allowed = new Set([
                'number',
                'name',
                'status',
                'phone',
                'email',
                'district',
                'state',
                'member_count'
              ])
              const ordering =
                typeof field === 'string' && allowed.has(field)
                  ? `${order?.dir === 'desc' ? '-' : ''}${field}`
                  : ''
              const sequence = ++requestSequence.current
              void getCoordinatorPage(
                current.country,
                Math.floor((request.start ?? 0) / (request.length || 20)) + 1,
                {
                  search: current.search,
                  status: current.statusFilter,
                  state: current.stateFilter,
                  district: current.districtFilter,
                  ordering
                }
              )
                .then((page) => {
                  if (sequence === requestSequence.current) {
                    setCount(page.count)
                    setError('')
                    finish()
                  }
                  callback({
                    draw: request.draw,
                    recordsTotal: page.count,
                    recordsFiltered: page.count,
                    data: page.results
                  })
                })
                .catch((cause) => {
                  if (sequence === requestSequence.current) {
                    setError(cause instanceof Error ? cause.message : 'Could not load coordinators')
                    finish()
                  }
                  callback({ draw: request.draw, recordsTotal: 0, recordsFiltered: 0, data: [] })
                })
            },
            lengthChange: false,
            searching: true,
            paging: true,
            info: true,
            autoWidth: false,
            order: [],
            layout: { topStart: null, topEnd: null, bottomStart: 'info', bottomEnd: 'paging' }
          }}
        >
          <Column title="Coordinator no." data="number">
            {(_value, _type, row: Coordinator) => `C-${row.number}`}
          </Column>
          <Column
            title="BBS number"
            data="bbs_number"
            options={{ defaultContent: '', orderable: false }}
          />
          <Column title="Coordinator" data="name">
            {(_value, _type, row: Coordinator) => (
              <button className="course-link" onClick={() => onCoordinator(row.coordinator_key)}>
                {row.name}
              </button>
            )}
          </Column>
          <Column title="Status" data="status">
            {(_value, _type, row: Coordinator) => statusLabel(row.status)}
          </Column>
          <Column title="Phone" data="phone" />
          <Column title="Email" data="email" />
          <Column title="District" data="district" />
          <Column title="State" data="state" />
          <Column title="People" data="member_count">
            {(_value, _type, row: Coordinator) => (
              <span
                title={`${row.active_member_count} active, ${row.discontinued_member_count} discontinued, ${row.dropout_member_count} dropout`}
              >
                {row.member_count} assigned
              </span>
            )}
          </Column>
          <Column title="Details" data="coordinator_key" options={{ orderable: false }}>
            {(_value, _type, row: Coordinator) => (
              <div className="course-inline-actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCoordinator(row.coordinator_key)}
                >
                  Details
                </Button>
                <Button variant="outline" size="sm" onClick={() => onManagePeople(row)}>
                  Add people
                </Button>
              </div>
            )}
          </Column>
        </DataTable>
      </div>
      {(loading || exporting) && (
        <FullScreenLoader
          message={exporting ? 'Preparing coordinator PDF' : 'Loading coordinators'}
          leaving={loading && !exporting && leaving}
        />
      )}
    </section>
  )
}
