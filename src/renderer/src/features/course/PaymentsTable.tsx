import { Button } from '@/components/ui/button'
import TransactionLedger from './TransactionLedger'
import type { CandidateSummary } from './courseApi'
import { formatPaymentBalance, paymentBalanceTone } from './paymentBalance'

export default function PaymentsTable({
  summary,
  onAddPayment,
  onTransactions,
  onRestored
}: {
  summary: CandidateSummary
  onAddPayment: () => void
  onTransactions: () => void
  onRestored: () => void
}): React.JSX.Element {
  return (
    <div className="candidate-payments">
      <div className="candidate-payments__top">
        <Button variant="outline" onClick={onTransactions}>Transactions</Button>
      </div>
      <div className="candidate-metrics candidate-metrics--payments">
        <span>Total paid: ₹{summary.total_paid}</span>
        <span>Balance: <strong className={paymentBalanceTone(summary.candidate.wallet_balance, summary.candidate.credit_balance)}>{formatPaymentBalance(summary.candidate.wallet_balance, summary.candidate.credit_balance)}</strong></span>
        <span>Payments: {summary.payment_count}</span>
        <span>Exams attended: {summary.candidate.exams_attended}</span>
        <span>Books paid: {summary.candidate.books_paid}</span>
        <span>Books remaining: {summary.candidate.remaining_books}</span>
        {summary.candidate.mode === 'OFFLINE' && <Button onClick={onAddPayment}>Add payment</Button>}
      </div>
      <TransactionLedger
        candidateKey={summary.candidate.enrollment_key}
        refreshKey={`${summary.payment_count}:${summary.candidate.wallet_balance}:${summary.candidate.credit_balance}`}
        onRestored={onRestored}
      />
    </div>
  )
}
