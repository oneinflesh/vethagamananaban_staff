import { useEffect, useRef, useState } from 'react'
import type { DataTableRef } from 'datatables.net-react'
import { Button } from '@/components/ui/button'
import { useNotifications } from '../notifications/Notifications'
import { DataTable, Column } from './dataTable'
import PaymentHistoryDialog from './PaymentHistoryDialog'
import { formatPaymentBalance, paymentBalanceTone } from './paymentBalance'
import { resizeColumns } from './resizeColumns'
import {
  candidateAction, distributeCoordinatorWallet, getCoordinatorPage,
  getCoordinatorWalletMembers, type Coordinator, type CoordinatorWalletMember
} from './courseApi'

type Stage = 'coordinators' | 'candidates'

function paymentCents(value: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return null
  const [whole, decimal = ''] = value.trim().split('.')
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, '0'))
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null
}

export default function CoordinatorPaymentsPage({ country, onBack, onCandidate, onCoordinator }: {
  country: string
  onBack: () => void
  onCandidate: (key: string) => void
  onCoordinator: (key: string) => void
}): React.JSX.Element {
  const notify = useNotifications()
  const [stage, setStage] = useState<Stage>('coordinators')
  const [coordinator, setCoordinator] = useState<Coordinator | null>(null)
  const [members, setMembers] = useState<CoordinatorWalletMember[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [amount, setAmount] = useState('')
  const [search, setSearch] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [memberStart, setMemberStart] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preparing, setPreparing] = useState<string | null>(null)
  const [historyKey, setHistoryKey] = useState<string | null>(null)
  const previousSaving = useRef(new Set<string>())
  const requestKey = useRef<string | null>(null)
  const coordinatorTable = useRef<DataTableRef>(null)
  const memberTable = useRef<DataTableRef>(null)

  useEffect(() => {
    coordinatorTable.current?.dt()?.ajax.reload()
  }, [country, search])

  async function chooseCoordinator(row: Coordinator): Promise<void> {
    setLoading(true)
    try {
      const result = await getCoordinatorWalletMembers(row.coordinator_key)
      setMembers(result)
      setCoordinator(row)
      setAmount('')
      setSelected(new Set())
      setMemberSearch('')
      setMemberStart(0)
      setStage('candidates')
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not load coordinator candidates')
    } finally {
      setLoading(false)
    }
  }

  const active = members.filter((row) => row.mode === 'OFFLINE' && row.status === 'ACTIVE')
  const ordered = active.filter((row) => selected.has(row.enrollment_key))
    .sort((a, b) => Number(a.bbs_number.replace(/\D/g, '')) - Number(b.bbs_number.replace(/\D/g, '')))
  const cents = paymentCents(amount)
  const requiredCents = ordered.reduce((sum, row) => sum + Math.round(Number(row.payment_due) * 100), 0)
  const visibleMembers = members.filter((row) =>
    `${row.bbs_number} ${row.name}`.toLowerCase().includes(memberSearch.trim().toLowerCase()))

  function keepMemberPage(): void {
    setMemberStart(memberTable.current?.dt()?.page.info().start ?? 0)
  }

  function toggle(key: string): void {
    keepMemberPage()
    requestKey.current = null
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function pay(): Promise<void> {
    if (!coordinator || saving || cents === null || !ordered.length) return
    if (previousSaving.current.size) {
      notify.error('Wait for the previous balance to save')
      return
    }
    if (cents !== requiredCents || ordered.some((row) => Number(row.payment_due) <= 0)) {
      notify.error(`Selected candidates need ₹${(requiredCents / 100).toFixed(2)} to fully fund their unpaid books`)
      return
    }
    setSaving(true)
    requestKey.current ??= crypto.randomUUID()
    try {
      const result = await distributeCoordinatorWallet(coordinator.coordinator_key, {
        amount: (cents / 100).toFixed(2),
        enrollment_keys: ordered.map((row) => row.enrollment_key),
        request_key: requestKey.current
      })
      notify.success(`₹${Number(result.amount).toFixed(2)} recorded for ${result.member_count} candidates`)
      requestKey.current = null
      setSelected(new Set())
      setAmount('')
      setStage('coordinators')
      try {
        setMembers(await getCoordinatorWalletMembers(coordinator.coordinator_key))
      } catch {
        notify.error('Payment saved, but candidate balances could not be refreshed')
      }
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not record coordinator payment')
    } finally {
      setSaving(false)
    }
  }

  async function creditSend(row: CoordinatorWalletMember): Promise<void> {
    if (preparing || row.credit_send_state !== 'READY') return
    setPreparing(row.enrollment_key)
    try {
      await candidateAction('credit-and-send', row.enrollment_key, {})
      notify.success(`${row.bbs_number} added to monthly dispatch`)
      if (coordinator) {
        try {
          setMembers(await getCoordinatorWalletMembers(coordinator.coordinator_key))
        } catch {
          notify.error('Book prepared, but candidate balances could not be refreshed')
        }
      }
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not prepare book on credit')
    } finally {
      setPreparing(null)
    }
  }

  async function savePreviousBalance(row: CoordinatorWalletMember, input: HTMLInputElement): Promise<void> {
    const value = input.value.trim()
    if (!value || previousSaving.current.has(row.enrollment_key)) return
    if (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) < 1) {
      notify.error('Enter a valid pending payment amount')
      return
    }
    if (row.previous_balance_entered && Number(value).toFixed(2) === row.previous_balance_amount) return
    previousSaving.current.add(row.enrollment_key)
    input.disabled = true
    try {
      await candidateAction('previous-balance', row.enrollment_key, {
        amount: Number(value).toFixed(2), replace: row.previous_balance_entered
      })
      if (coordinator) {
        const updated = await getCoordinatorWalletMembers(coordinator.coordinator_key)
        setMembers(updated)
        setSelected((current) => new Set(updated.filter((item) => current.has(item.enrollment_key) && Number(item.payment_due) > 0)
          .map((item) => item.enrollment_key)))
      }
      notify.success(`${row.bbs_number} previous balance saved`)
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not save previous balance')
    } finally {
      previousSaving.current.delete(row.enrollment_key)
      input.disabled = false
    }
  }

  const creditLabels: Record<CoordinatorWalletMember['credit_send_state'], string> = {
    READY: 'Credit and send', NOT_AVAILABLE: 'Not available', MONTH_NOT_OPEN: 'Month not open',
    ALREADY_IN_DISPATCH: 'Already in dispatch', ALREADY_COMPLETED: 'Book completed',
    WALLET_AVAILABLE: 'Wallet balance', PRICE_UNAVAILABLE: 'Price unavailable'
  }

  return <section className="page course-page">
    <div className="course-toolbar course-toolbar--payments">
      <Button variant="outline" onClick={onBack}>← Payments</Button>
      <h1>Coordinator payments</h1>
      <span>{country}</span>
      <label className="course-list-search">Search
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="C number or name" />
      </label>
    </div>
    <div className="course-table-wrap course-table-wrap--candidates" onPointerDown={resizeColumns}>
      <DataTable ref={coordinatorTable} className="display course-table" options={{
        serverSide: true, processing: true, pageLength: 20, lengthChange: false, searching: false,
        ordering: false, autoWidth: false,
        layout: { topStart: null, topEnd: null, bottomStart: 'info', bottomEnd: 'paging' },
        ajax: (request, callback) => {
          void getCoordinatorPage(country, Math.floor((request.start ?? 0) / (request.length || 20)) + 1,
            { search, status: 'ACTIVE' })
            .then((page) => callback({ draw: request.draw, recordsTotal: page.count,
              recordsFiltered: page.count, data: page.results }))
            .catch((error) => {
              notify.error(error instanceof Error ? error.message : 'Could not load coordinators')
              callback({ draw: request.draw, recordsTotal: 0, recordsFiltered: 0, data: [] })
            })
        }
      }}>
        <Column title="C number" data="number">{(_value, _type, row: Coordinator) =>
          <button className="course-link" onClick={() => onCoordinator(row.coordinator_key)}>C-{row.number}</button>}</Column>
        <Column title="Coordinator" data="name" />
        <Column title="People" data="active_member_count" />
        <Column title="District" data="district" />
        <Column title="State" data="state" />
        <Column title="Payment" data="coordinator_key">{(_value, _type, row: Coordinator) =>
          <Button variant="outline" disabled={loading} onClick={() => void chooseCoordinator(row)}>Payment</Button>}</Column>
      </DataTable>
    </div>
    {stage !== 'coordinators' && <div className="course-dialog-backdrop" onClick={() => setStage('coordinators')}>
      <section className="course-coordinator-payment-dialog" role="dialog" aria-modal="true"
        aria-label={`Payment for C-${coordinator?.number} ${coordinator?.name}`} onClick={(event) => event.stopPropagation()}>
        <div className="course-dialog__header">
          <h2>C-{coordinator?.number} {coordinator?.name}</h2>
          <Button variant="ghost" onClick={() => setStage('coordinators')}>Close</Button>
        </div>
    {stage === 'candidates' && <>
      <div className="course-coordinator-payment-controls">
        <label className="course-coordinator-payment-amount">Total amount
          <input type="text" inputMode="decimal" value={amount} placeholder="₹ Amount"
            onChange={(event) => { requestKey.current = null; setAmount(event.target.value) }} />
        </label>
        <Button variant="outline" onClick={() => {
          keepMemberPage()
          requestKey.current = null
          const payable = active.filter((row) => Number(row.payment_due) > 0)
          setSelected(selected.size === payable.length ? new Set() : new Set(payable.map((row) => row.enrollment_key)))
        }}>{selected.size === active.filter((row) => Number(row.payment_due) > 0).length ? 'Deselect all' : 'Select all'}</Button>
        <span>{selected.size} selected</span>
        <strong>Required ₹{(requiredCents / 100).toFixed(2)} · Entered ₹{((cents ?? 0) / 100).toFixed(2)}</strong>
        <label className="course-list-search">Search
          <input value={memberSearch} onChange={(event) => { setMemberStart(0); setMemberSearch(event.target.value) }}
            placeholder="BBS number or name" />
        </label>
        <Button disabled={saving || !ordered.length || cents === null || cents !== requiredCents || ordered.some((row) => Number(row.payment_due) <= 0)} onClick={() => void pay()}>
          {saving ? 'Recording…' : 'Make payment'}
        </Button>
      </div>
      <div className="course-table-wrap course-table-wrap--candidates" onPointerDown={resizeColumns}>
        <DataTable ref={memberTable} key={`${coordinator?.coordinator_key}:${[...selected].sort().join(',')}:${memberSearch}`}
          data={visibleMembers} className="display course-table" options={{
          pageLength: 20, displayStart: memberStart, lengthChange: false, searching: false, ordering: false, autoWidth: false,
          layout: { topStart: null, topEnd: null, bottomStart: 'info', bottomEnd: 'paging' }
        }}>
          <Column title="Select" data="enrollment_key">{(_value, _type, row: CoordinatorWalletMember) =>
            <input type="checkbox" aria-label={`Select ${row.bbs_number}`} checked={selected.has(row.enrollment_key)}
              disabled={row.mode !== 'OFFLINE' || row.status !== 'ACTIVE' || Number(row.payment_due) <= 0} onChange={() => toggle(row.enrollment_key)} />}</Column>
          <Column title="BBS number" data="bbs_number">{(_value, _type, row: CoordinatorWalletMember) =>
            <button className="course-link" onClick={() => onCandidate(row.enrollment_key)}>{row.bbs_number}</button>}</Column>
          <Column title="Name" data="name" />
          <Column title="Status" data="status" />
          <Column title="Balance" data="wallet_balance">{(_value, _type, row: CoordinatorWalletMember) =>
            <span className={paymentBalanceTone(row.wallet_balance, row.credit_balance)}>{formatPaymentBalance(row.wallet_balance, row.credit_balance)}</span>}</Column>
          <Column title="Exams attended" data="exams_attended" />
          <Column title="Books sent" data="books_sent" />
          <Column title="Books paid" data="books_paid" />
          <Column title="Pending payment" data="enrollment_key">{(_value, _type, row: CoordinatorWalletMember) => row.mode === 'OFFLINE' ?
            <input className="course-quick-payment course-previous-balance-input" type="text" inputMode="decimal"
              aria-label={`Previous balance for ${row.bbs_number}`}
              defaultValue={row.previous_balance_entered ? row.previous_balance_amount : ''}
              onBlur={(event) => void savePreviousBalance(row, event.currentTarget)}
              onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} /> : '—'}</Column>
          <Column title="Unpaid book" data="payment_book" />
          <Column title="Amount needed" data="payment_due">{(_value, _type, row: CoordinatorWalletMember) =>
            Number(row.payment_due) > 0 ? `₹${Number(row.payment_due).toFixed(2)}` : '—'}</Column>
          <Column title="Options" data="enrollment_key">{(_value, _type, row: CoordinatorWalletMember) => <span className="course-coordinator-payment-options">
            <Button variant="outline" onClick={() => setHistoryKey(row.enrollment_key)}>History</Button>
            <Button variant="outline" disabled={row.credit_send_state !== 'READY' || preparing !== null}
              onClick={() => void creditSend(row)}>{preparing === row.enrollment_key ? 'Preparing…' : creditLabels[row.credit_send_state]}</Button>
          </span>}</Column>
        </DataTable>
      </div>
    </>}
      </section>
    </div>}
    {historyKey && <PaymentHistoryDialog candidateKey={historyKey} onClose={() => setHistoryKey(null)}
      onRestored={() => { if (coordinator) void getCoordinatorWalletMembers(coordinator.coordinator_key).then(setMembers) }} />}
  </section>
}
