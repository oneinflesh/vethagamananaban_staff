import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { DataTableRef } from 'datatables.net-react'
import { Button } from '@/components/ui/button'
import { useNotifications } from '../notifications/Notifications'
import { DataTable, Column } from './dataTable'
import { candidateAction, getPaymentBalances, type PaymentBalance } from './courseApi'
import { resizeColumns } from './resizeColumns'
import PaymentHistoryDialog from './PaymentHistoryDialog'

export default function CoursePaymentsPage({
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
  const rows = useRef<PaymentBalance[]>([])
  const query = useRef({ country, search: '' })
  const saving = useRef(new Set<string>())
  const preparing = useRef(new Set<string>())
  const [search, setSearch] = useState('')
  const [menu, setMenu] = useState<{ key: string; x: number; y: number } | null>(null)
  const [historyKey, setHistoryKey] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      query.current = { country, search: search.trim() }
      table.current?.dt()?.ajax.reload()
    }, 300)
    return () => window.clearTimeout(timer)
  }, [country, search])

  async function save(row: PaymentBalance, kind: 'wallet' | 'credit', input: HTMLInputElement): Promise<void> {
    const raw = input.value.trim()
    if (!raw) return
    if (!/^\d+(\.\d{1,2})?$/.test(raw) || Number(raw) < 1) {
      notify.error('Enter an amount of at least ₹1 with up to two decimal places.')
      return
    }
    const key = `${row.enrollment_key}:${kind}`
    if (saving.current.has(key)) return
    saving.current.add(key)
    input.disabled = true
    try {
      await candidateAction(kind === 'wallet' ? 'manual-purchase' : 'manual-credit', row.enrollment_key, {
        amount: Number(raw).toFixed(2),
        payment_method: 'CASH'
      })
      input.value = ''
      table.current?.dt()?.ajax.reload(undefined, false)
      notify.success(kind === 'wallet' ? 'Payment recorded' : 'Credit charge recorded')
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not save amount')
    } finally {
      saving.current.delete(key)
      input.disabled = false
    }
  }

  function amountInput(row: PaymentBalance, kind: 'wallet' | 'credit'): React.JSX.Element | string {
    if (row.mode !== 'OFFLINE' || (kind === 'wallet' && row.status !== 'ACTIVE')) return '—'
    return (
      <input
        className="course-quick-payment"
        type="number"
        min="1"
        step="0.01"
        placeholder="₹ Amount"
        aria-label={`${kind === 'wallet' ? 'Wallet payment' : 'Credit charge'} for ${row.bbs_number}`}
        onBlur={(event) => void save(row, kind, event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
      />
    )
  }

  async function creditAndSend(row: PaymentBalance, button: HTMLButtonElement): Promise<void> {
    if (row.credit_send_state !== 'READY' || preparing.current.has(row.enrollment_key)) return
    preparing.current.add(row.enrollment_key)
    button.disabled = true
    button.textContent = 'Preparing…'
    try {
      await candidateAction('credit-and-send', row.enrollment_key, {})
      row.credit_send_state = 'ALREADY_IN_DISPATCH'
      button.textContent = 'Already in dispatch list'
      table.current?.dt()?.ajax.reload(undefined, false)
      notify.success('Book added to monthly dispatch. Credit is charged when shipped.')
    } catch (error) {
      button.disabled = false
      button.textContent = 'Credit and send'
      notify.error(error instanceof Error ? error.message : 'Could not prepare book')
      table.current?.dt()?.ajax.reload(undefined, false)
    } finally {
      preparing.current.delete(row.enrollment_key)
    }
  }

  function creditSendButton(row: PaymentBalance): React.JSX.Element {
    const labels: Record<PaymentBalance['credit_send_state'], string> = {
      READY: 'Credit and send',
      NOT_AVAILABLE: 'Not available',
      MONTH_NOT_OPEN: 'Month not open',
      ALREADY_IN_DISPATCH: 'Already in dispatch list',
      ALREADY_COMPLETED: 'Book completed',
      WALLET_AVAILABLE: 'Wallet available'
    }
    return <Button variant="outline" disabled={row.credit_send_state !== 'READY'} onClick={(event) => void creditAndSend(row, event.currentTarget)}>{labels[row.credit_send_state]}</Button>
  }

  function openMenu(event: MouseEvent<HTMLDivElement>): void {
    const key = (event.target as HTMLElement).closest('tr')?.id
    if (!key || !rows.current.some((row) => row.enrollment_key === key)) return
    event.preventDefault()
    setMenu({ key, x: Math.min(event.clientX, window.innerWidth - 180), y: event.clientY })
  }

  return (
    <section className="page course-page" onClick={() => menu && setMenu(null)}>
      <div className="course-toolbar course-toolbar--payments">
        <Button variant="outline" onClick={onBack}>← Course</Button>
        <h1>Payments</h1>
        <span>{country}</span>
        <label className="course-list-search">
          Search
          <input type="search" value={search} placeholder="BBS number or name" onChange={(event) => setSearch(event.target.value)} />
        </label>
      </div>
      <div className="course-table-wrap course-table-wrap--candidates" onContextMenu={openMenu} onPointerDown={resizeColumns}>
        <DataTable
          ref={table}
          className="display course-table"
          options={{
            serverSide: true,
            processing: true,
            pageLength: 20,
            lengthChange: false,
            searching: false,
            ordering: false,
            autoWidth: false,
            rowId: 'enrollment_key',
            layout: { topStart: null, topEnd: null, bottomStart: 'info', bottomEnd: 'paging' },
            ajax: (request, callback) => {
              const page = Math.floor((request.start ?? 0) / (request.length || 20)) + 1
              void getPaymentBalances(query.current.country, page, query.current.search)
                .then((result) => {
                  rows.current = result.results
                  callback({ draw: request.draw, recordsTotal: result.count, recordsFiltered: result.count, data: result.results })
                })
                .catch((error) => {
                  notify.error(error instanceof Error ? error.message : 'Could not load payments')
                  callback({ draw: request.draw, recordsTotal: 0, recordsFiltered: 0, data: [] })
                })
            }
          }}
        >
          <Column title="BBS number" data="bbs_number">
            {(_value, _type, row: PaymentBalance) => <button className="course-link" onClick={() => onCandidate(row.enrollment_key)}>{row.bbs_number}</button>}
          </Column>
          <Column title="Name" data="name" />
          <Column title="Wallet" data="wallet_balance">{(_value, _type, row: PaymentBalance) => `₹${row.wallet_balance}`}</Column>
          <Column title="Credit owed" data="credit_balance">{(_value, _type, row: PaymentBalance) => `₹${row.credit_balance}`}</Column>
          <Column title="Quick Wallet Payment" data="enrollment_key">{(_value, _type, row: PaymentBalance) => amountInput(row, 'wallet')}</Column>
          <Column title="Quick Credit Payment" data="enrollment_key">{(_value, _type, row: PaymentBalance) => amountInput(row, 'credit')}</Column>
          <Column title="Credit and send" data="credit_send_state">{(_value, _type, row: PaymentBalance) => creditSendButton(row)}</Column>
        </DataTable>
      </div>
      {menu && (
        <div className="course-context-menu course-context-menu--actions" style={{ left: menu.x, top: menu.y }} onClick={(event) => event.stopPropagation()}>
          <button onClick={() => { onCandidate(menu.key); setMenu(null) }}>View candidate</button>
          <button onClick={() => { setHistoryKey(menu.key); setMenu(null) }}>Payment history</button>
        </div>
      )}
      {historyKey && <PaymentHistoryDialog candidateKey={historyKey} onClose={() => setHistoryKey(null)} />}
    </section>
  )
}
