import { useState } from 'react'
import { Button } from '@/components/ui/button'
import TransactionLedger from './TransactionLedger'
import type { PaymentHistoryPage } from './courseApi'
import { formatPaymentBalance, paymentBalanceTone } from './paymentBalance'

export default function PaymentHistoryDialog({
  candidateKey,
  onClose,
  onRestored
}: {
  candidateKey: string
  onClose: () => void
  onRestored?: () => void
}): React.JSX.Element {
  const [data, setData] = useState<PaymentHistoryPage | null>(null)

  return (
    <div className="course-dialog-backdrop" onClick={onClose}>
      <section className="course-payment-history" role="dialog" aria-modal="true" aria-label="Transactions" onClick={(event) => event.stopPropagation()}>
        <div className="course-payment-history__header">
          <div>
            <h2>Transactions</h2>
            <span>{data ? `${data.bbs_number} · ${data.name}` : ''}</span>
          </div>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
        <div className="course-payment-history__balances">
          <div><small>Balance</small><strong className={data ? paymentBalanceTone(data.wallet_balance, data.credit_balance) : ''}>{data ? formatPaymentBalance(data.wallet_balance, data.credit_balance) : '—'}</strong></div>
        </div>
        <TransactionLedger candidateKey={candidateKey} onData={setData} onRestored={onRestored} />
      </section>
    </div>
  )
}
