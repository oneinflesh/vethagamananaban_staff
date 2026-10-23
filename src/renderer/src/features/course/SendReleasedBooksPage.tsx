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
  type OtherBookOption
} from './courseApi'

export default function SendReleasedBooksPage({
  candidate,
  onBack
}: {
  candidate: Candidate
  onBack: () => void
}): React.JSX.Element {
  const [books, setBooks] = useState<OtherBookOption[] | null>(null)
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
        setBooks(options)
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

  async function ship(): Promise<void> {
    if (!selected.size || !tracking.trim() || busy) return
    setBusy(true)
    try {
      await candidateAction('other-book-dispatch', candidate.enrollment_key, {
        release_keys: [...selected],
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
        <h1>Send released books</h1>
        <span>
          {candidate.full_name} · {candidate.bbs_identifier}
        </span>
      </div>
      <div className="course-wallet-balance">Wallet balance: ₹{balance}</div>
      <div className="course-list-actions">
        <label className="course-list-filter">
          Tracking number
          <Input
            value={tracking}
            onChange={(event) => setTracking(event.target.value)}
            maxLength={100}
          />
        </label>
        <Button disabled={!selected.size || !tracking.trim() || busy} onClick={() => void ship()}>
          {busy ? 'Shipping…' : `Ship selected (${selected.size})`}
        </Button>
      </div>
      {error && (
        <div className="course-error">
          {error}{' '}
          <Button variant="link" onClick={() => setReload((value) => value + 1)}>
            Retry
          </Button>
        </div>
      )}
      <div className="course-book-grid">
        {(books ?? []).map((book) => {
          const available = book.released && !book.assigned && Boolean(book.release_key)
          return (
            <label
              className={`course-book-option${available ? '' : ' course-book-option--disabled'}`}
              key={book.sequence}
            >
              <input
                type="checkbox"
                checked={Boolean(book.release_key && selected.has(book.release_key))}
                disabled={!available || busy}
                onChange={(event) => {
                  if (!book.release_key) return
                  setSelected((current) => {
                    const next = new Set(current)
                    if (event.target.checked) next.add(book.release_key as string)
                    else next.delete(book.release_key as string)
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
                    ? 'Already assigned'
                    : book.released
                      ? `Released · Cycle ${book.cycle}`
                      : 'Not released yet'}
                </small>
              </span>
            </label>
          )
        })}
      </div>
      {books && !books.length && <p>No course books are configured.</p>}
      {!books && !error && <FullScreenLoader message="Loading course books" />}
    </section>
  )
}
