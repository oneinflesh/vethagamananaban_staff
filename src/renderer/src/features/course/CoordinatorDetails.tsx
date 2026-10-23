import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import FullScreenLoader from '../shell/FullScreenLoader'
import { useSmoothLoading } from '../shell/useSmoothLoading'
import {
  getCoordinator,
  getCoordinatorMembers,
  type Coordinator,
  type CoordinatorMember
} from './courseApi'
import { DataTable, Column } from './dataTable'

export default function CoordinatorDetails({
  coordinatorKey,
  onBack,
  onCandidate
}: {
  coordinatorKey: string
  onBack: () => void
  onCandidate: (key: string) => void
}): React.JSX.Element {
  const [coordinator, setCoordinator] = useState<Coordinator | null>(null)
  const [members, setMembers] = useState<CoordinatorMember[]>([])
  const [error, setError] = useState('')
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
  return (
    <section className="page course-page">
      <div className="course-toolbar">
        <Button variant="outline" onClick={onBack}>
          ← Candidates
        </Button>
        <h1>{coordinator?.name || 'Coordinator'}</h1>
        <span>{coordinator?.member_count ?? 0} people</span>
      </div>
      {error && <p className="course-error">{error}</p>}
      {coordinator && (
        <div className="coordinator-summary">
          <span>Phone: {coordinator.phone}</span>
          <span>Email: {coordinator.email}</span>
          <span>
            Address:{' '}
            {[
              coordinator.address_line1,
              coordinator.address_line2,
              coordinator.district,
              coordinator.state,
              coordinator.postal_code
            ]
              .filter(Boolean)
              .join(', ')}
          </span>
          <span>Country: {coordinator.country}</span>
        </div>
      )}
      <div className="course-table-wrap">
        <DataTable
          data={members}
          className="display course-table"
          options={{ paging: false, searching: false, info: false, order: [] }}
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
