import { DataTable, Column } from './dataTable'
import type { CandidateSummary } from './courseApi'

export default function PaymentsTable({
  summary
}: {
  summary: CandidateSummary
}): React.JSX.Element {
  return (
    <div className="course-table-wrap">
      <div className="candidate-metrics">
        <span>Total paid: {summary.total_paid}</span>
        <span>Payments: {summary.payment_count}</span>
        <span>Books paid: {summary.candidate.paid_books}</span>
        <span>Books remaining: {summary.candidate.remaining_books}</span>
      </div>
      <DataTable
        data={summary.payments}
        className="display course-table"
        options={{ paging: false, searching: false, info: false, order: [] }}
      >
        <Column title="Date" data="paid_at">
          {(_value, _type, row) => row.paid_at?.slice(0, 10) || row.created_at?.slice(0, 10) || '—'}
        </Column>
        <Column title="Purpose" data="purpose" />
        <Column title="Method" data="method" />
        <Column title="Amount" data="amount" />
        <Column title="Status" data="status" />
      </DataTable>
    </div>
  )
}
