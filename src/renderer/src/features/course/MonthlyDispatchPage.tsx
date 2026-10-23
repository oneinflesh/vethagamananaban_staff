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
  getMonthlyAllocations,
  getMonthlySummary,
  getRegistrationOptions,
  openMonthlyDispatch,
  shipMonthlyAllocation,
  type ExamInfo,
  type MonthlyAllocation,
  type MonthlySummary,
  type MonthlyStudent,
  type RegistrationOptions
} from './courseApi'

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
  const [view, setView] = useState<DispatchView>('dispatch')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [retry, setRetry] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState<{
    row: DispatchRow | null
    enrollmentKey: string
    bbsNumber: string
    x: number
    y: number
  } | null>(null)
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
    Promise.all([getMonthlySummary(examKey, country), getMonthlyAllocations(examKey, country)])
      .then(([nextSummary, nextAllocations]) => {
        if (!active) return
        setSummary(nextSummary)
        setAllocations(nextAllocations)
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
  const statuses = useMemo(() => [...new Set(rows.map((row) => row.status))].sort(), [rows])
  const visibleRows = useMemo(
    () => rows.filter((row) => !statusFilter || row.status === statusFilter),
    [rows, statusFilter]
  )

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
    const rowElement = (event.target as HTMLElement).closest('tr')
    const row =
      view === 'dispatch'
        ? (visibleRows.find((item) => item.allocation_key === rowElement?.id) ?? null)
        : null
    const student =
      view === 'dispatch' ? row : unpaid.find((item) => item.enrollment_key === rowElement?.id)
    if (!student) return
    event.preventDefault()
    setMenu({
      row,
      enrollmentKey: student.enrollment_key,
      bbsNumber: student.bbs_number,
      x: Math.min(event.clientX, window.innerWidth - 220),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 250))
    })
  }

  async function changeCandidateStatus(
    enrollmentKey: string,
    bbsNumber: string,
    status: 'SUSPENDED' | 'DROPOUT'
  ): Promise<void> {
    const label = status === 'DROPOUT' ? 'dropout' : 'discontinued'
    setMenu(null)
    if (
      !window.confirm(
        `Mark ${bbsNumber} as ${label}? The candidate will leave this active dispatch list.`
      )
    )
      return
    setBusy(true)
    try {
      await candidateAction('update-status', enrollmentKey, { status })
      notify.success(`${bbsNumber} marked ${label}`)
      refresh()
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not change candidate status')
    } finally {
      setBusy(false)
    }
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
      {view === 'dispatch' && (
        <div className="course-list-actions course-list-actions--dispatch-filter">
          <label className="course-list-filter">
            Book status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
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
        rows={visibleRows}
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
          <button
            onClick={() => {
              onCandidate(menu.enrollmentKey)
              setMenu(null)
            }}
          >
            View candidate
          </button>
          {menu.row?.status === 'READY' && (
            <button
              onClick={() => {
                setMenu(null)
                void openMonth()
              }}
            >
              Open month to prepare book
            </button>
          )}
          {menu.row && (menu.row.kind === 'funded' || menu.row.status === 'PROCESSING') && (
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
              void changeCandidateStatus(menu.enrollmentKey, menu.bbsNumber, 'SUSPENDED')
            }}
          >
            Discontinue candidate
          </button>
          <button
            onClick={() => {
              void changeCandidateStatus(menu.enrollmentKey, menu.bbsNumber, 'DROPOUT')
            }}
          >
            Dropout candidate
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
