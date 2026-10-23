import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import FullScreenLoader from '../shell/FullScreenLoader'
import { useSmoothLoading } from '../shell/useSmoothLoading'
import { getCoordinators, type Coordinator } from './courseApi'
import { DataTable, Column } from './dataTable'
import { resizeColumns } from './resizeColumns'

export default function CoordinatorList({
  country,
  onBack,
  onCoordinator
}: {
  country: string
  onBack: () => void
  onCoordinator: (key: string) => void
}): React.JSX.Element {
  const [records, setRecords] = useState<Coordinator[]>([])
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const { loading, leaving, start, finish } = useSmoothLoading()
  useEffect(() => {
    let active = true
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
  }, [country, retry, finish])
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
        <Button
          variant="outline"
          onClick={() => {
            start()
            setRetry((value) => value + 1)
          }}
        >
          Refresh
        </Button>
      </div>
      {error && <div className="course-error">{error}</div>}
      <div
        className="course-table-wrap course-table-wrap--candidates"
        onPointerDown={resizeColumns}
      >
        <DataTable
          data={records}
          className="display course-table"
          options={{
            pageLength: 20,
            lengthChange: false,
            searching: true,
            paging: true,
            info: true,
            autoWidth: false,
            order: []
          }}
        >
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCoordinator(row.coordinator_key)}
              >
                View people
              </Button>
            )}
          </Column>
        </DataTable>
      </div>
      {loading && <FullScreenLoader message="Loading coordinators" leaving={leaving} />}
    </section>
  )
}
