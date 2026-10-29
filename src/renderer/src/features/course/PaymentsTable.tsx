import { DataTable, Column } from './dataTable'
import { Button } from '@/components/ui/button'
import type { CandidateSummary } from './courseApi'

export default function PaymentsTable({
  summary,
  onAddPayment
}: {
  summary: CandidateSummary
  onAddPayment: () => void
}): React.JSX.Element {
  return (
    <div className="course-table-wrap">
      <div className="candidate-metrics">
        <span>Total paid: ₹{summary.total_paid}</span>
        <span>Rupee balance: ₹{summary.candidate.wallet_balance}</span>
        <span>Vethagama Nanban credit owed: ₹{summary.candidate.credit_balance}</span>
        <span>Payments: {summary.payment_count}</span>
        <span>Books paid: {summary.candidate.paid_books}</span>
        <span>Books remaining: {summary.candidate.remaining_books}</span>
        {summary.candidate.mode === 'OFFLINE' && (
          <Button onClick={onAddPayment}>Add payment</Button>
        )}
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
        <Column title="Books funded" data="months" />
        <Column title="Locked book price" data="locked_book_price">
          {(_value, _type, row) => (row.wallet_topup ? `₹${row.locked_book_price}` : '—')}
        </Column>
        <Column title="Status" data="status" />
      </DataTable>
      {summary.credit_entries.length > 0 && (
        <>
          <h2>Credit history</h2>
          <DataTable data={summary.credit_entries} className="display course-table" options={{ paging: false, searching: false, info: false, order: [] }}>
            <Column title="Date" data="created_at">{(_value, _type, row) => row.created_at?.slice(0, 10)}</Column>
            <Column title="Book" data="book" options={{ defaultContent: '' }} />
            <Column title="Details" data="note" />
            <Column title="Credit change" data="amount">{(_value, _type, row) => `₹${row.amount}`}</Column>
          </DataTable>
        </>
      )}
    </div>
  )
}
