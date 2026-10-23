import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FullScreenLoader from '../shell/FullScreenLoader'
import { useNotifications } from '../notifications/Notifications'
import {
  candidateAction,
  getCandidate,
  getOtherBookOptions,
  type Candidate,
  type OtherBookOptions
} from './courseApi'

export default function SendReleasedBooksPage({
  candidate,
  onBack
}: {
  candidate: Candidate
  onBack: () => void
}): React.JSX.Element {
  const [options, setOptions] = useState<OtherBookOptions | null>(null)
  const [balance, setBalance] = useState(candidate.wallet_balance)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [tracking, setTracking] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)
  const notify = useNotifications()

  useEffect(() => {
    let active = true
    Promise.all([
      getOtherBookOptions(candidate.enrollment_key),
      getCandidate(candidate.enrollment_key)
    ])
      .then(([options, summary]) => {
        if (!active) return
        setOptions(options)
        setBalance(summary.candidate.wallet_balance)
        setError('')
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load books')
      })
    return () => {
      active = false
    }
  }, [candidate.enrollment_key, reload])

  const selectedBooks = options?.books.filter((book) => selected.has(book.exam_key)) ?? []
  const newBookCount = selectedBooks.filter((book) => !book.preassigned).length
  const selectedCost =
    selectedBooks.reduce((sum, book) => sum + Number(book.pending_price ?? 0), 0) +
    (options?.funded_prices ?? [])
      .slice(0, newBookCount)
      .reduce((sum, price) => sum + Number(price), 0)
  const remainingBalance = Number(balance) - selectedCost
  const canFund = newBookCount <= (options?.funded_prices.length ?? 0) && remainingBalance >= 0

  async function ship(): Promise<void> {
    if (!selected.size || !tracking.trim() || !canFund || busy) return
    setBusy(true)
    try {
      await candidateAction('other-book-dispatch', candidate.enrollment_key, {
        exam_keys: [...selected],
        tracking_number: tracking.trim()
      })
      notify.success(`${selected.size} book${selected.size === 1 ? '' : 's'} shipped`)
      onBack()
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not ship books')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="page course-page">
      <div className="course-toolbar">
        <Button variant="outline" onClick={onBack}>
          ← Candidates
        </Button>
        <h1>Send course books</h1>
      </div>
      <div className="course-book-candidate">
        <strong>{candidate.full_name}</strong>
        <span>{candidate.bbs_identifier}</span>
      </div>
      <div className="course-wallet-balance">
        Wallet balance: ₹{balance} · Selected books: ₹{selectedCost.toFixed(2)} · After shipping: ₹
        {remainingBalance.toFixed(2)}
      </div>
      <div className="course-list-actions">
        <label className="course-list-filter">
          Tracking number
          <Input
            value={tracking}
            onChange={(event) => setTracking(event.target.value)}
            maxLength={100}
          />
        </label>
        <Button
          disabled={!selected.size || !tracking.trim() || !canFund || busy}
          onClick={() => void ship()}
        >
          {busy ? 'Shipping…' : `Ship selected (${selected.size})`}
        </Button>
      </div>
      {selected.size > 0 && !canFund && (
        <p className="course-error">
          Not enough funded books or wallet balance for this selection.
        </p>
      )}
      {error && (
        <div className="course-error">
          {error}{' '}
          <Button variant="link" onClick={() => setReload((value) => value + 1)}>
            Retry
          </Button>
        </div>
      )}
      <div className="course-book-grid">
        {(options?.books ?? []).map((book) => {
          const available = book.active && !book.assigned
          return (
            <label
              className={`course-book-option${available ? '' : ' course-book-option--disabled'}`}
              key={book.sequence}
            >
              <input
                type="checkbox"
                checked={selected.has(book.exam_key)}
                disabled={!available || busy}
                onChange={(event) => {
                  setSelected((current) => {
                    const next = new Set(current)
                    if (event.target.checked) next.add(book.exam_key)
                    else next.delete(book.exam_key)
                    return next
                  })
                }}
              />
              <span>
                <strong>
                  {book.sequence}. {book.exam_title}
                </strong>
                <small>
                  {book.assigned
                    ? 'Already sent'
                    : !book.active
                      ? 'Inactive book'
                      : book.preassigned
                        ? 'Allocated · Ready to ship'
                        : book.released
                          ? `Released · Cycle ${book.cycle}`
                          : 'Available for staff dispatch'}
                </small>
              </span>
            </label>
          )
        })}
      </div>
      {options && !options.books.length && <p>No course books are configured.</p>}
      {!options && !error && <FullScreenLoader message="Loading course books" />}
    </section>
  )
}
