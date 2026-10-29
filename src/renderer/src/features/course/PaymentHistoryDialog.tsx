import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable, Column } from './dataTable'
import { getPaymentHistory, type PaymentHistoryPage, type PaymentHistoryEntry } from './courseApi'

export default function PaymentHistoryDialog({
  candidateKey,
  onClose
}: {
  candidateKey: string
  onClose: () => void
}): React.JSX.Element {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PaymentHistoryPage | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    getPaymentHistory(candidateKey, page)
      .then((result) => {
        if (active) { setData(result); setError('') }
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load payment history')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [candidateKey, page])

  return (
    <div className="course-dialog-backdrop" onClick={onClose}>
      <section className="course-payment-history" role="dialog" aria-modal="true" aria-label="Payment history" onClick={(event) => event.stopPropagation()}>
        <div className="course-payment-history__header">
          <div>
            <h2>Payment history</h2>
            <span>{data ? `${data.bbs_number} · ${data.name}` : 'Loading candidate'}</span>
          </div>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
        <div className="course-payment-history__balances">
          <div><small>Wallet balance</small><strong>₹{data?.wallet_balance ?? '—'}</strong></div>
          <div><small>Credit owed</small><strong>₹{data?.credit_balance ?? '—'}</strong></div>
        </div>
        {error && <div className="course-error">{error}</div>}
        <div className="course-payment-history__table">
          {data && (
            <DataTable
              key={`${candidateKey}:${page}`}
              data={data.results}
              className="display course-table"
              options={{ paging: false, searching: false, info: false, ordering: false,
                createdRow: (row, entry) => row.classList.add(`course-payment-history__${(entry as PaymentHistoryEntry).kind.toLowerCase()}`) }}
            >
              <Column title="Date" data="date">{(_value, _type, row: PaymentHistoryEntry) => new Date(row.date).toLocaleString('en-IN')}</Column>
              <Column title="Transaction ID" data="transaction_id">
                {(_value, _type, row: PaymentHistoryEntry) => <span className="course-payment-history__id">{row.transaction_id}</span>}
              </Column>
              <Column title="Details" data="details" />
              <Column title="Amount" data="amount">
                {(_value, _type, row: PaymentHistoryEntry) => `${Number(row.amount) < 0 ? '−' : '+'}₹${Math.abs(Number(row.amount)).toFixed(2)}`}
              </Column>
            </DataTable>
          )}
          {loading && <p>Loading transactions…</p>}
          {data && !loading && !data.results.length && <p>No transactions yet.</p>}
        </div>
        <div className="course-payment-history__footer">
          <span>{data ? `${data.count} transactions · 20 per page` : ''}</span>
          <div>
            <Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Previous</Button>
            <span>Page {page} of {Math.max(1, Math.ceil((data?.count ?? 0) / 20))}</span>
            <Button variant="outline" disabled={loading || !data || page * 20 >= data.count} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      </section>
    </div>
  )
}
