import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FullScreenLoader from '../shell/FullScreenLoader'
import { useNotifications } from '../notifications/Notifications'
import { useSmoothLoading } from '../shell/useSmoothLoading'
import MonthlyDispatchTable, { type DispatchRow, type DispatchView } from './MonthlyDispatchTable'
import {
  candidateAction,
  getInitialDispatch,
  getMonthlyAddresses,
  getMonthlyAllocations,
  getMonthlySummary,
  getRegistrationOptions,
  openMonthlyDispatch,
  shipMonthlyAllocation,
  type ExamInfo,
  type MonthlyAllocation,
  type MonthlyAddressReport,
  type MonthlySummary,
  type MonthlyStudent,
  type RegistrationOptions
} from './courseApi'
import { exportMonthlyAddressCsv, printMonthlyAddressLabels, type PaperSize } from './addressLabels'

function monthLabel(exam: ExamInfo): string {
  if (!exam.scheduled_month) return `${exam.sequence}. ${exam.catalog_book_name || exam.title}`
  const date = new Date(`${exam.scheduled_month}-01T00:00:00`)
  return `${exam.sequence}. ${exam.catalog_book_name || exam.title} — ${date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`
}

export default function MonthlyDispatchPage({
  country,
  onBack,
  onCandidate
}: {
  country: string
  onBack: () => void
  onCandidate: (key: string) => void
}): React.JSX.Element {
  const [options, setOptions] = useState<RegistrationOptions | null>(null)
  const [examKey, setExamKey] = useState('')
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [allocations, setAllocations] = useState<MonthlyAllocation[]>([])
  const [addresses, setAddresses] = useState<MonthlyAddressReport | null>(null)
  const [view, setView] = useState<DispatchView>('dispatch')
  const [paper, setPaper] = useState<PaperSize>('A3')
  const [search, setSearch] = useState('')
  const [retry, setRetry] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState<{ row: DispatchRow; x: number; y: number } | null>(null)
  const [shipping, setShipping] = useState<DispatchRow | null>(null)
  const [tracking, setTracking] = useState('')
  const notify = useNotifications()
  const { loading, leaving, start, finish } = useSmoothLoading()

  useEffect(() => {
    let active = true
    getRegistrationOptions()
      .then((result) => {
        if (!active) return
        setOptions(result)
        if (!result.exams.length) {
          setError('No course months are configured.')
          finish()
          return
        }
        setExamKey(
          result.exams.find((item) => item.is_current)?.exam_key ?? result.exams[0]?.exam_key ?? ''
        )
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Could not load course months')
          finish()
        }
      })
    return () => {
      active = false
    }
  }, [finish])

  useEffect(() => {
    if (!examKey || !options) return
    let active = true
    start()
    Promise.all([
      getMonthlySummary(examKey, country),
      getMonthlyAllocations(examKey, country),
      getMonthlyAddresses(options.course.course_key, country)
    ])
      .then(([nextSummary, nextAllocations, nextAddresses]) => {
        if (!active) return
        setSummary(nextSummary)
        setAllocations(nextAllocations)
        setAddresses(nextAddresses)
        setError('')
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load dispatch')
      })
      .finally(() => {
        if (active) finish()
      })
    return () => {
      active = false
    }
  }, [examKey, country, options, retry, start, finish])

  const exam = options?.exams.find((item) => item.exam_key === examKey)
  const rows = useMemo<DispatchRow[]>(() => {
    const existing = allocations.map((row) => ({ ...row, kind: 'allocation' as const }))
    if (!exam?.is_current || !summary) return existing
    const allocated = new Set(allocations.map((row) => row.enrollment_key))
    const funded = summary.funded_pending
      .filter((student) => !allocated.has(student.enrollment_key))
      .map((student) => ({
        kind: 'funded' as const,
        allocation_key: `funded:${student.enrollment_key}`,
        enrollment_key: student.enrollment_key,
        bbs_number: student.bbs_number,
        student_name: student.name,
        student_phone: student.phone,
        book_number: exam.catalog_book_name || exam.title,
        exam_title: exam.title,
        payment_amount: '—',
        purchased_at: null,
        status: 'FUNDED',
        tracking_number: '',
        delivery_address_key: null,
        delivery_address: null
      }))
    return [...funded, ...existing]
  }, [allocations, summary, exam])

  const unpaid: MonthlyStudent[] =
    view === 'previous' ? (summary?.previous_exam_unpaid ?? []) : (summary?.all_unpaid ?? [])

  function refresh(): void {
    start()
    setRetry((value) => value + 1)
  }

  async function openMonth(): Promise<void> {
    if (!examKey) return
    setBusy(true)
    try {
      const result = await openMonthlyDispatch(examKey, country)
      notify.success(
        `${result.processing} book${result.processing === 1 ? '' : 's'} opened for dispatch`
      )
      refresh()
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not open month')
    } finally {
      setBusy(false)
    }
  }

  function addressAction(action: 'print' | 'csv'): void {
    try {
      if (!addresses?.addresses.length)
        throw new Error('No active offline addresses are available.')
      if (action === 'csv') exportMonthlyAddressCsv(addresses.addresses)
      else printMonthlyAddressLabels(addresses.addresses, paper)
      if (addresses.missing_address_count)
        notify.error(
          `${addresses.missing_address_count} active candidate(s) have no mailing address and were skipped.`
        )
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not generate addresses')
    }
  }

  async function ship(): Promise<void> {
    if (!shipping || !tracking.trim()) return
    setBusy(true)
    try {
      if (shipping.kind === 'funded') {
        const dispatch = await getInitialDispatch(shipping.enrollment_key)
        const current = dispatch.items[0]
        if (
          !dispatch.wallet_funded ||
          !current ||
          current.dispatched ||
          current.status === 'UNFUNDED'
        )
          throw new Error('The current book is not ready to ship.')
        await candidateAction('initial-dispatch', shipping.enrollment_key, {
          allocation_keys: [current.allocation_key],
          tracking_number: tracking.trim()
        })
      } else {
        if (shipping.status !== 'PROCESSING')
          throw new Error('Open this month before shipping this book.')
        if (!shipping.delivery_address_key)
          throw new Error('This candidate needs a delivery address before shipping.')
        await shipMonthlyAllocation(
          shipping.allocation_key,
          shipping.delivery_address_key,
          tracking.trim()
        )
      }
      notify.success(`${shipping.bbs_number} marked shipped`)
      setShipping(null)
      setTracking('')
      refresh()
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not ship book')
    } finally {
      setBusy(false)
    }
  }

  function openMenu(event: MouseEvent<HTMLDivElement>): void {
    if (view !== 'dispatch') return
    const rowElement = (event.target as HTMLElement).closest('tr')
    const row = rows.find((item) => item.allocation_key === rowElement?.id)
    if (!row) return
    event.preventDefault()
    setMenu({
      row,
      x: Math.min(event.clientX, window.innerWidth - 220),
      y: Math.min(event.clientY, window.innerHeight - 100)
    })
  }

  return (
    <section className="page course-page" onClick={() => menu && setMenu(null)}>
      <div className="course-toolbar">
        <Button variant="outline" onClick={onBack}>
          ← Course
        </Button>
        <h1>Monthly book dispatch</h1>
        <span>{country}</span>
      </div>
      <div className="course-list-actions">
        <label className="course-list-filter">
          Book / month
          <select
            value={examKey}
            onChange={(event) => {
              setExamKey(event.target.value)
              start()
            }}
          >
            {(options?.exams ?? []).map((item) => (
              <option key={item.exam_key} value={item.exam_key}>
                {monthLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <Button variant="outline" disabled={!examKey || busy} onClick={() => void openMonth()}>
          Open month
        </Button>
        <Button variant="outline" disabled={!examKey || busy} onClick={refresh}>
          Refresh
        </Button>
        <Button
          variant={view === 'dispatch' ? 'secondary' : 'outline'}
          onClick={() => setView('dispatch')}
        >
          Dispatch
        </Button>
        <Button
          variant={view === 'unpaid' ? 'secondary' : 'outline'}
          onClick={() => setView('unpaid')}
        >
          All unpaid ({summary?.unpaid_count ?? 0})
        </Button>
        <Button
          variant={view === 'previous' ? 'secondary' : 'outline'}
          onClick={() => setView('previous')}
        >
          Previous exam complete, unpaid ({summary?.previous_exam_unpaid_count ?? 0})
        </Button>
      </div>
      <div className="course-list-actions">
        <label className="course-list-filter">
          Address paper
          <select value={paper} onChange={(event) => setPaper(event.target.value as PaperSize)}>
            <option value="A3">A3 — 40 labels</option>
            <option value="A4">A4 — 20 labels</option>
          </select>
        </label>
        <Button
          variant="outline"
          disabled={busy || !addresses?.addresses.length}
          onClick={() => addressAction('print')}
        >
          Print / save address PDF
        </Button>
        <Button
          variant="outline"
          disabled={busy || !addresses?.addresses.length}
          onClick={() => addressAction('csv')}
        >
          Export address CSV
        </Button>
        <label className="course-list-search">
          Search
          <input
            type="search"
            value={search}
            placeholder="Name, BBS or phone"
            onChange={(event) => {
              setSearch(event.target.value)
            }}
          />
        </label>
      </div>
      {summary && (
        <div className="course-dispatch-stats">
          <span>Paid: {summary.paid_count}</span>
          <span>Amount: ₹{summary.paid_amount}</span>
          <span>Funded, awaiting book: {summary.funded_pending_count}</span>
          <span>Unpaid: {summary.unpaid_count}</span>
        </div>
      )}
      {error && <div className="course-error">{error}</div>}
      <MonthlyDispatchTable
        rows={rows}
        unpaid={unpaid}
        view={view}
        search={search}
        onCandidate={onCandidate}
        onContextMenu={openMenu}
      />
      {menu && (
        <div
          className="course-context-menu course-context-menu--actions"
          style={{ left: menu.x, top: menu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          {(menu.row.kind === 'funded' || menu.row.status === 'PROCESSING') && (
            <button
              onClick={() => {
                setShipping(menu.row)
                setMenu(null)
              }}
            >
              Enter tracking and ship
            </button>
          )}
          <button
            onClick={() => {
              onCandidate(menu.row.enrollment_key)
              setMenu(null)
            }}
          >
            View candidate
          </button>
        </div>
      )}
      {shipping && (
        <div className="course-dialog-backdrop" onClick={() => setShipping(null)}>
          <section
            className="course-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Ship course book"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="course-dialog__header">
              <h2>Ship course book</h2>
              <Button variant="ghost" onClick={() => setShipping(null)}>
                Close
              </Button>
            </div>
            <p>
              {shipping.student_name} · {shipping.bbs_number} · {shipping.exam_title}
            </p>
            <label className="course-dialog__field">
              Tracking ID
              <Input
                value={tracking}
                onChange={(event) => setTracking(event.target.value)}
                autoFocus
              />
            </label>
            <div className="course-dialog__footer">
              <Button variant="outline" onClick={() => setShipping(null)}>
                Cancel
              </Button>
              <Button disabled={busy || !tracking.trim()} onClick={() => void ship()}>
                Save as shipped
              </Button>
            </div>
          </section>
        </div>
      )}
      {(loading || busy) && (
        <FullScreenLoader
          message={busy ? 'Updating monthly dispatch' : 'Loading monthly dispatch'}
          leaving={loading && leaving}
        />
      )}
    </section>
  )
}
