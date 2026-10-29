import { DataTable, Column } from './dataTable'
import { Button } from '@/components/ui/button'
import type { CandidateSummary } from './courseApi'

type CreditEntry = CandidateSummary['credit_entries'][number]

function visibleCreditEntries(entries: CreditEntry[]): CreditEntry[] {
  const result = entries.map((entry) => ({ ...entry }))
  for (const settlement of result.filter((entry) => entry.note === 'Existing wallet applied to Vethagama Nanban credit')) {
    const charge = result.find((entry) =>
      entry !== settlement && entry.note === 'Staff credit charge' &&
      entry.created_at <= settlement.created_at &&
      Number(entry.amount) > 0 && Number(entry.amount) === -Number(settlement.amount)
    )
    if (charge) {
      charge.note = 'Staff credit charge (paid from wallet)'
      settlement.note = '__merged__'
    }
  }
  return result.filter((entry) => entry.note !== '__merged__')
}

export default function PaymentsTable({
  summary,
  onAddPayment,
  onTransactions
}: {
  summary: CandidateSummary
  onAddPayment: () => void
  onTransactions: () => void
}): React.JSX.Element {
  const creditEntries = visibleCreditEntries(summary.credit_entries)
  return (
    <div className="candidate-payments">
      <div className="candidate-payments__top">
        <Button variant="outline" onClick={onTransactions}>Transactions</Button>
      </div>
      <div className="candidate-metrics candidate-metrics--payments">
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
      <div className="course-table-wrap"><DataTable
        data={summary.payments}
        className="display course-table"
        options={{ paging: false, searching: false, info: false, order: [],
          createdRow: (row, payment) => {
            if (summary.restored_payment_keys.includes((payment as CandidateSummary['payments'][number]).payment_key))
              row.classList.add('course-payment-history__restored')
          } }}
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
        <Column title="Status" data="status">{(_value, _type, row) => summary.restored_payment_keys.includes(row.payment_key) ? 'Restored' : row.status}</Column>
      </DataTable></div>
      {creditEntries.length > 0 && (
        <div className="candidate-payments__credit">
          <h2>Credit history</h2>
          <div className="course-table-wrap"><DataTable data={creditEntries} className="display course-table" options={{ paging: false, searching: false, info: false, order: [] }}>
            <Column title="Date" data="created_at">{(_value, _type, row) => row.created_at?.slice(0, 10)}</Column>
            <Column title="Book" data="book" options={{ defaultContent: '' }} />
            <Column title="Details" data="note" />
            <Column title="Credit change" data="amount">{(_value, _type, row) => `₹${row.amount}`}</Column>
          </DataTable></div>
        </div>
      )}
    </div>
  )
}
