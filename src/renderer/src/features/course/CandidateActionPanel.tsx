import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNotifications } from '../notifications/Notifications'
import {
  candidateAction,
  getCandidate,
  getInitialDispatch,
  getOtherBookOptions,
  getRegistrationOptions,
  type Candidate,
  type CandidateSummary,
  type InitialDispatch,
  type OtherBookOption,
  type RegistrationOptions
} from './courseApi'

export type CandidateAction =
  'parcel' | 'otherBook' | 'payment' | 'password' | 'discontinue' | 'dropout' | 'restore'

export default function CandidateActionPanel({
  action,
  candidate,
  onClose,
  onChanged
}: {
  action: CandidateAction
  candidate: Candidate
  onClose: () => void
  onChanged: () => void
}): React.JSX.Element {
  const [dispatch, setDispatch] = useState<InitialDispatch | null>(null)
  const [otherBooks, setOtherBooks] = useState<OtherBookOption[] | null>(null)
  const [selectedReleases, setSelectedReleases] = useState<Set<string>>(() => new Set())
  const [options, setOptions] = useState<RegistrationOptions | null>(null)
  const [summary, setSummary] = useState<CandidateSummary | null>(null)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [months, setMonths] = useState(1)
  const [includeIdCard, setIncludeIdCard] = useState(false)
  const [parcelOperation, setParcelOperation] = useState<'send' | 'tracking' | 'undo'>('send')
  const [tracking, setTracking] = useState('')
  const [password, setPassword] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const notify = useNotifications()

  useEffect(() => {
    let active = true
    if (action === 'parcel')
      getInitialDispatch(candidate.enrollment_key)
        .then((result) => {
          if (active) setDispatch(result)
        })
        .catch((cause) => {
          if (active) setError(cause instanceof Error ? cause.message : 'Could not load parcel')
        })
    if (action === 'payment')
      Promise.all([getRegistrationOptions(), getCandidate(candidate.enrollment_key)])
        .then(([course, record]) => {
          if (active) {
            setOptions(course)
            setSummary(record)
          }
        })
        .catch((cause) => {
          if (active)
            setError(cause instanceof Error ? cause.message : 'Could not load payment details')
        })
    if (action === 'otherBook')
      getOtherBookOptions(candidate.enrollment_key)
        .then((releases) => {
          if (active) {
            setOtherBooks(releases)
          }
        })
        .catch((cause) => {
          if (active)
            setError(cause instanceof Error ? cause.message : 'Could not load released books')
        })
    return () => {
      active = false
    }
  }, [action, candidate.enrollment_key])

  async function submit(): Promise<void> {
    setSaving(true)
    setError('')
    try {
      if (action === 'password') {
        if (password.length < 8) throw new Error('Enter a password with at least 8 characters.')
        await candidateAction('set-password', candidate.enrollment_key, { password })
      } else if (action === 'discontinue' || action === 'dropout' || action === 'restore') {
        await candidateAction('update-status', candidate.enrollment_key, {
          status: action === 'restore' ? 'ACTIVE' : action === 'dropout' ? 'DROPOUT' : 'SUSPENDED'
        })
      } else if (action === 'parcel') {
        if (!includeIdCard && selected.size === 0)
          throw new Error('Select the ID card or at least one book.')
        if (parcelOperation === 'tracking' && !tracking.trim())
          throw new Error('Enter a tracking number.')
        await candidateAction(
          'initial-dispatch',
          candidate.enrollment_key,
          parcelOperation === 'undo'
            ? { undo_id_card: includeIdCard, undo_allocation_keys: [...selected] }
            : {
                include_id_card: includeIdCard,
                allocation_keys: [...selected],
                tracking_number: tracking.trim()
              }
        )
      } else if (action === 'otherBook') {
        if (!selectedReleases.size) throw new Error('Choose at least one released book.')
        if (!tracking.trim()) throw new Error('Enter a tracking number.')
        await candidateAction('other-book-dispatch', candidate.enrollment_key, {
          release_keys: [...selectedReleases],
          tracking_number: tracking.trim()
        })
      } else {
        if (!Number.isInteger(months) || months < 1 || months > 50)
          throw new Error('Choose a valid number of books to fund.')
        await candidateAction('manual-purchase', candidate.enrollment_key, {
          months,
          payment_method: paymentMethod
        })
      }
      notify.success(action === 'otherBook' ? 'Selected books shipped' : 'Candidate updated')
      onChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update candidate')
    } finally {
      setSaving(false)
    }
  }

  const title = {
    parcel: 'Prepare ID card and registration books',
    otherBook: 'Send released books',
    payment: 'Record offline payment',
    password: 'Change password',
    discontinue: 'Discontinue candidate',
    dropout: 'Dropout candidate',
    restore: 'Activate candidate'
  }[action]
  return (
    <div className="course-dialog-backdrop" onClick={onClose}>
      <section
        className="course-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="course-dialog__header">
          <h2>{title}</h2>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <p>
          {candidate.full_name} · {candidate.bbs_identifier}
        </p>
        {error && <div className="course-error">{error}</div>}
        {action === 'password' && (
          <label className="course-dialog__field">
            New password
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
            />
          </label>
        )}
        {action === 'discontinue' && <p>Discontinue this candidate? They can be restored later.</p>}
        {action === 'dropout' && (
          <p>Mark this candidate as dropped out? They can be restored later.</p>
        )}
        {action === 'restore' && <p>Activate this candidate?</p>}
        {action === 'otherBook' &&
          (otherBooks ? (
            <>
              <div className="course-wallet-balance">
                Wallet balance: ₹{candidate.wallet_balance}
              </div>
              {otherBooks.length ? (
                <>
                  <div className="course-choice-list">
                    {otherBooks.map((item) => (
                      <label className="course-choice" key={item.release_key}>
                        <input
                          type="checkbox"
                          checked={selectedReleases.has(item.release_key)}
                          disabled={item.assigned}
                          onChange={(event) =>
                            setSelectedReleases((current) => {
                              const next = new Set(current)
                              if (event.target.checked) next.add(item.release_key)
                              else next.delete(item.release_key)
                              return next
                            })
                          }
                        />
                        {item.sequence}. {item.exam_title} · Cycle {item.cycle}
                        {item.assigned ? ' (already assigned)' : ''}
                      </label>
                    ))}
                  </div>
                  <label className="course-dialog__field">
                    Tracking number
                    <Input value={tracking} onChange={(event) => setTracking(event.target.value)} />
                  </label>
                </>
              ) : (
                <p>No released books are available for this candidate.</p>
              )}
            </>
          ) : (
            !error && <p>Loading released books…</p>
          ))}
        {action === 'parcel' &&
          (dispatch ? (
            <>
              <div className="course-tabs">
                {(dispatch.wallet_funded
                  ? (['send'] as const)
                  : (['send', 'tracking', 'undo'] as const)
                ).map((operation) => (
                  <Button
                    key={operation}
                    variant={parcelOperation === operation ? 'secondary' : 'outline'}
                    onClick={() => {
                      setParcelOperation(operation)
                      setSelected(new Set())
                      setIncludeIdCard(false)
                    }}
                  >
                    {operation === 'send'
                      ? 'Mark sent'
                      : operation === 'tracking'
                        ? 'Update tracking'
                        : 'Undo sent'}
                  </Button>
                ))}
              </div>
              <label className="course-choice">
                <input
                  type="checkbox"
                  checked={includeIdCard}
                  disabled={
                    parcelOperation === 'send'
                      ? dispatch.id_card_dispatched
                      : !dispatch.id_card_dispatched
                  }
                  onChange={(event) => setIncludeIdCard(event.target.checked)}
                />{' '}
                ID card {dispatch.id_card_dispatched ? '(already sent)' : ''}
              </label>
              <div className="course-choice-list">
                {dispatch.items.map((item) => (
                  <label className="course-choice" key={item.allocation_key}>
                    <input
                      type="checkbox"
                      checked={selected.has(item.allocation_key)}
                      disabled={
                        parcelOperation === 'send'
                          ? item.dispatched || item.status === 'UNFUNDED'
                          : parcelOperation === 'tracking'
                            ? !item.dispatched
                            : item.status !== 'SHIPPED'
                      }
                      onChange={(event) =>
                        setSelected((current) => {
                          const next = new Set(current)
                          if (event.target.checked) next.add(item.allocation_key)
                          else next.delete(item.allocation_key)
                          return next
                        })
                      }
                    />{' '}
                    {item.book_number} · {item.book_name} {item.dispatched ? '(already sent)' : ''}
                  </label>
                ))}
              </div>
              {dispatch.wallet_funded && (
                <p>
                  Rupee balance: ₹{dispatch.wallet_balance}. Only the current month’s book is
                  eligible for this parcel.
                </p>
              )}
              {parcelOperation !== 'undo' && (
                <label className="course-dialog__field">
                  Tracking number {parcelOperation === 'tracking' ? '' : '(optional)'}
                  <Input value={tracking} onChange={(event) => setTracking(event.target.value)} />
                </label>
              )}
            </>
          ) : (
            !error && <p>Loading parcel…</p>
          ))}
        {action === 'payment' &&
          (options && summary ? (
            <>
              <p>
                Wallet balance: ₹{summary.candidate.wallet_balance} · Locked price for this payment:
                ₹{options.course.offline_month_fee} per book
              </p>
              <label className="course-dialog__field">
                Number of books to fund
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={months}
                  onChange={(event) => setMonths(Number(event.target.value))}
                />
              </label>
              <p>Amount to add: ₹{Number(options.course.offline_month_fee) * months}</p>
              <label className="course-dialog__field">
                Payment method
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
            </>
          ) : (
            !error && <p>Loading books…</p>
          ))}
        <div className="course-dialog__footer">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={
              saving ||
              (action === 'parcel' && !dispatch) ||
              (action === 'payment' && !options) ||
              (action === 'otherBook' && (!otherBooks?.length || !selectedReleases.size))
            }
            onClick={() => void submit()}
          >
            {saving ? 'Saving…' : 'Confirm'}
          </Button>
        </div>
      </section>
    </div>
  )
}
