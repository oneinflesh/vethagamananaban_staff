import { useEffect, useRef, useState } from 'react'
import type { DataTableRef } from 'datatables.net-react'
import { Button } from '@/components/ui/button'
import { useNotifications } from '../notifications/Notifications'
import { DataTable, Column } from './dataTable'
import { candidateAction, getPaymentBalances, type Candidate, type PaymentBalance } from './courseApi'
import { formatPaymentBalance, paymentBalanceTone } from './paymentBalance'
import { resizeColumns } from './resizeColumns'

export default function PreviousBalancePage({
  country,
  onBack,
  onCandidate
}: {
  country: string
  onBack: () => void
  onCandidate: (key: string) => void
}): React.JSX.Element {
  const notify = useNotifications()
  const table = useRef<DataTableRef>(null)
  const query = useRef({ country, search: '' })
  const saving = useRef(new Set<string>())
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      query.current = { country, search: search.trim() }
      table.current?.dt()?.ajax.reload()
    }, 300)
    return () => window.clearTimeout(timer)
  }, [country, search])

  async function save(row: PaymentBalance, input: HTMLInputElement): Promise<void> {
    const raw = input.value.trim()
    if (!raw || saving.current.has(row.enrollment_key)) return
    if (!/^\d+(\.\d{1,2})?$/.test(raw) || Number(raw) < 1) {
      notify.error('Enter an amount of at least ₹1 with up to two decimal places.')
      return
    }
    saving.current.add(row.enrollment_key)
    input.disabled = true
    try {
      const updated = await candidateAction('previous-balance', row.enrollment_key, {
        amount: Number(raw).toFixed(2)
      }) as Candidate
      row.wallet_balance = updated.wallet_balance
      row.credit_balance = updated.credit_balance
      row.books_paid = updated.books_paid
      row.books_sent = updated.books_sent
      row.previous_balance_entered = true
      const balance = input.closest('tr')?.querySelector<HTMLElement>('[data-net-balance]')
      if (balance) {
        balance.textContent = formatPaymentBalance(row.wallet_balance, row.credit_balance)
        balance.className = paymentBalanceTone(row.wallet_balance, row.credit_balance)
      }
      const paid = input.closest('tr')?.querySelector<HTMLElement>('[data-books-paid]')
      if (paid) paid.textContent = String(row.books_paid)
      const sent = input.closest('tr')?.querySelector<HTMLElement>('[data-books-sent]')
      if (sent) sent.textContent = String(row.books_sent)
      input.value = ''
      input.placeholder = 'Entered'
      notify.success(`${row.bbs_number} previous balance saved`)
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not save previous balance')
    } finally {
      saving.current.delete(row.enrollment_key)
      input.disabled = row.previous_balance_entered
    }
  }

  function pendingInput(row: PaymentBalance): React.JSX.Element | string {
    if (row.mode !== 'OFFLINE') return '—'
    if (row.previous_balance_entered) return 'Entered'
    return <input
      className="course-quick-payment course-previous-balance-input"
      type="number" min="1" step="0.01" placeholder="₹ Amount"
      aria-label={`Pending payment for ${row.bbs_number}`}
      onBlur={(event) => void save(row, event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') return
        event.preventDefault()
        const next = event.currentTarget.closest('tr')?.nextElementSibling?.querySelector<HTMLInputElement>('.course-previous-balance-input:not(:disabled)')
        if (next) next.focus()
        else event.currentTarget.blur()
      }}
    />
  }

  return <section className="page course-page">
    <div className="course-toolbar course-toolbar--payments">
      <Button variant="outline" onClick={onBack}>← Payments</Button>
      <h1>Previous balance entry</h1>
      <span>{country}</span>
      <label className="course-list-search">
        Search
        <input type="search" value={search} placeholder="BBS number or name" onChange={(event) => setSearch(event.target.value)} />
      </label>
    </div>
    <div className="course-table-wrap course-table-wrap--candidates" onPointerDown={resizeColumns}>
      <DataTable ref={table} className="display course-table" options={{
        serverSide: true, processing: true, pageLength: 20, lengthChange: false,
        searching: false, ordering: false, autoWidth: false, rowId: 'enrollment_key',
        layout: { topStart: null, topEnd: null, bottomStart: 'info', bottomEnd: 'paging' },
        ajax: (request, callback) => {
          const page = Math.floor((request.start ?? 0) / (request.length || 20)) + 1
          void getPaymentBalances(query.current.country, page, query.current.search)
            .then((result) => callback({ draw: request.draw, recordsTotal: result.count, recordsFiltered: result.count, data: result.results }))
            .catch((error) => {
              notify.error(error instanceof Error ? error.message : 'Could not load candidates')
              callback({ draw: request.draw, recordsTotal: 0, recordsFiltered: 0, data: [] })
            })
        }
      }}>
        <Column title="BBS number" data="bbs_number">{(_value, _type, row: PaymentBalance) => <button className="course-link" onClick={() => onCandidate(row.enrollment_key)}>{row.bbs_number}</button>}</Column>
        <Column title="Name" data="name" />
        <Column title="Balance" data="wallet_balance">{(_value, _type, row: PaymentBalance) => <span data-net-balance className={paymentBalanceTone(row.wallet_balance, row.credit_balance)}>{formatPaymentBalance(row.wallet_balance, row.credit_balance)}</span>}</Column>
        <Column title="Exams attended" data="exams_attended" />
        <Column title="Books sent" data="books_sent">{(_value, _type, row: PaymentBalance) => <span data-books-sent>{row.books_sent}</span>}</Column>
        <Column title="Books paid" data="books_paid">{(_value, _type, row: PaymentBalance) => <span data-books-paid>{row.books_paid}</span>}</Column>
        <Column title="Pending Payment" data="enrollment_key">{(_value, _type, row: PaymentBalance) => pendingInput(row)}</Column>
      </DataTable>
    </div>
  </section>
}
