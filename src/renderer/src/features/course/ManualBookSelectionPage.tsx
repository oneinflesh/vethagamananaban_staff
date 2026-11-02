import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useNotifications } from '../notifications/Notifications'
import FullScreenLoader from '../shell/FullScreenLoader'
import { candidateAction, getOtherBookOptions, type Candidate, type OtherBookOptions } from './courseApi'

export default function ManualBookSelectionPage({ candidate, onBack }: {
  candidate: Candidate
  onBack: () => void
}): React.JSX.Element {
  const [options, setOptions] = useState<OtherBookOptions | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [credit, setCredit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const notify = useNotifications()

  useEffect(() => {
    let active = true
    getOtherBookOptions(candidate.enrollment_key).then((result) => {
      if (active) setOptions(result)
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Could not load books')
    })
    return () => { active = false }
  }, [candidate.enrollment_key])

  const books = options?.manual_books ?? []
  const selectedBooks = books.filter((book) => selected.has(book.exam_key))
  const total = selectedBooks.reduce((sum, book) => sum + Number(book.price ?? 0), 0)
  const balance = Number(options?.wallet_balance ?? 0)
  const shortfall = Math.max(0, total - balance)
  const canSend = selected.size > 0 && !!options?.manual_address
    && (credit || shortfall === 0) && !saving

  async function send(): Promise<void> {
    if (!canSend) return
    setSaving(true)
    try {
      await candidateAction('manual-book-dispatch', candidate.enrollment_key, {
        exam_keys: [...selected], tracking_number: '', allow_credit: credit
      })
      notify.success(`${selected.size} book${selected.size === 1 ? '' : 's'} parcelled`)
      onBack()
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not send books')
    } finally {
      setSaving(false)
    }
  }

  return <section className="page course-page course-manual-book-page">
    <div className="course-toolbar course-toolbar--manual-dispatch">
      <Button variant="outline" onClick={onBack}>← Send released books</Button>
      <h1>{candidate.bbs_identifier} · {candidate.full_name}</h1>
    </div>
    {error && <p className="course-error">{error}</p>}
    {options && <>
      <div className="course-manual-book-summary">
        <div><small>Wallet</small><strong>₹{balance.toFixed(2)}</strong></div>
        <div><small>Selected</small><strong>{selected.size} · ₹{total.toFixed(2)}</strong></div>
        <div><small>After sending</small><strong>₹{(balance - total).toFixed(2)}</strong></div>
        <div className="course-manual-book-address"><small>Delivery address</small>
          <strong>{options.manual_address
            ? `${options.manual_address.recipient_name}, ${options.manual_address.line1}, ${options.manual_address.city}, ${options.manual_address.state} ${options.manual_address.postal_code}`
            : 'No delivery address'}</strong>
        </div>
      </div>
      <div className="course-manual-book-controls">
        <label className="course-manual-book-credit"><input type="checkbox" checked={credit}
          onChange={(event) => setCredit(event.target.checked)} /> Use credit for any shortfall</label>
        <Button disabled={!canSend} onClick={() => void send()}>{saving ? 'Preparing…' : 'Parcel selected books'}</Button>
      </div>
      {shortfall > 0 && !credit && <p className="course-error">₹{shortfall.toFixed(2)} more is needed, or use credit.</p>}
      <div className="course-book-grid course-manual-book-grid">
        {books.map((book) => {
          const available = book.active && book.price !== null && book.stock > 0
          return <label key={book.exam_key}
            className={`course-book-option${available ? '' : ' course-book-option--disabled'}${book.marks !== null && book.marks !== undefined ? ' course-manual-book--examined' : ''}`}>
            <input type="checkbox" checked={selected.has(book.exam_key)} disabled={!available || saving}
              onChange={(event) => setSelected((current) => {
                const next = new Set(current)
                if (event.target.checked) next.add(book.exam_key)
                else next.delete(book.exam_key)
                return next
              })} />
            <span><strong>{book.sequence}. {book.book_name || book.exam_title}</strong>
              {book.marks !== null && book.marks !== undefined && <small>Exam mark: {book.marks} · Resend available</small>}
              <small>{!book.active ? 'Inactive'
                : book.price === null ? 'Price unavailable' : book.stock < 1 ? 'Out of stock'
                  : `₹${Number(book.price).toFixed(2)}${book.assigned ? ' · Sent before' : ''}`}</small></span>
          </label>
        })}
      </div>
    </>}
    {!options && !error && <FullScreenLoader message="Loading course books" />}
  </section>
}
