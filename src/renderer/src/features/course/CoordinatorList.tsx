import { useEffect, useMemo, useRef, useState } from 'react'
import type { DataTableRef } from 'datatables.net-react'
import { Button } from '@/components/ui/button'
import FullScreenLoader from '../shell/FullScreenLoader'
import { useSmoothLoading } from '../shell/useSmoothLoading'
import { getCoordinators, type Coordinator } from './courseApi'
import { DataTable, Column } from './dataTable'
import { resizeColumns } from './resizeColumns'
import { fieldOptions, statusLabel } from './tableFilters'
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
  const [records, setRecords] = useState<Coordinator[]>([])
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [districtFilter, setDistrictFilter] = useState('')
  const table = useRef<DataTableRef>(null)
  const { loading, leaving, start, finish } = useSmoothLoading()
  useEffect(() => {
    let active = true
    start()
    getCoordinators(country)
      .then((result) => {
        if (active) {
          setRecords(result.results)
          setError('')
        }
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load coordinators')
      })
      .finally(() => {
        if (active) finish()
      })
    return () => {
      active = false
    }
  }, [country, retry, start, finish])
  const filtered = useMemo(
    () =>
      records.filter(
        (row) =>
          (!statusFilter || (row.enrollment_status ?? 'NONE') === statusFilter) &&
          (!stateFilter || row.state === stateFilter) &&
          (!districtFilter || row.district === districtFilter)
      ),
    [records, statusFilter, stateFilter, districtFilter]
  )
  return (
    <section className="page course-page">
      <div className="course-toolbar">
        <Button variant="outline" onClick={onBack}>
          ← Course
        </Button>
        <h1>Coordinators</h1>
        <span>
          {country} · {records.length} coordinators
        </span>
        <Button onClick={onCreate}>Create coordinator</Button>
      </div>
      <div className="course-list-actions">
        <Button
          variant="outline"
          disabled={!filtered.length}
          onClick={() => printCoordinatorReport(filtered, country)}
        >
          PDF coordinator list
        </Button>
        <Button
          variant="outline"
          disabled={!filtered.length}
          onClick={() => printCoordinatorLabels(filtered)}
        >
          Print coordinator addresses
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            start()
            setRetry((value) => value + 1)
          }}
        >
          Refresh
        </Button>
        <label className="course-list-filter">
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            {fieldOptions(records, 'enrollment_status').map((value) => (
              <option key={value} value={value}>
                {statusLabel(value)}
              </option>
            ))}
            {records.some((row) => !row.enrollment_status) && (
              <option value="NONE">No linked candidate</option>
            )}
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
            {fieldOptions(records, 'state').map((value) => (
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
            {fieldOptions(
              records.filter((row) => !stateFilter || row.state === stateFilter),
              'district'
            ).map((value) => (
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
              table.current?.dt()?.search(event.target.value).draw()
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
          data={filtered}
          className="display course-table"
          options={{
            pageLength: 20,
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
          <Column title="BBS number" data="bbs_number" options={{ defaultContent: '' }} />
          <Column title="Coordinator" data="name">
            {(_value, _type, row: Coordinator) => (
              <button className="course-link" onClick={() => onCoordinator(row.coordinator_key)}>
                {row.name}
              </button>
            )}
          </Column>
          <Column title="Phone" data="phone" />
          <Column title="Email" data="email" />
          <Column title="District" data="district" />
          <Column title="State" data="state" />
          <Column title="People" data="member_count" />
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
      {loading && <FullScreenLoader message="Loading coordinators" leaving={leaving} />}
    </section>
  )
}
