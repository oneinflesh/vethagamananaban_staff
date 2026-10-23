import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNotifications } from '../notifications/Notifications'
import {
  candidateAction,
  getCandidate,
  getInitialDispatch,
  getRegistrationOptions,
  type Candidate,
  type CandidateSummary,
  type InitialDispatch,
  type RegistrationOptions
} from './courseApi'

export type CandidateAction = 'parcel' | 'payment' | 'password' | 'discontinue' | 'restore'

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
  const [options, setOptions] = useState<RegistrationOptions | null>(null)
  const [summary, setSummary] = useState<CandidateSummary | null>(null)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
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
    return () => {
      active = false
    }
  }, [action, candidate.enrollment_key])

  const purchased = new Set(
    summary?.results.filter((item) => item.mode === 'OFFLINE').map((item) => item.exam_key) ?? []
  )
  const available =
    options?.exams.filter((item) => item.is_active && !purchased.has(item.exam_key)) ?? []

  async function submit(): Promise<void> {
    setSaving(true)
    setError('')
    try {
      if (action === 'password') {
        if (password.length < 8) throw new Error('Enter a password with at least 8 characters.')
        await candidateAction('set-password', candidate.enrollment_key, { password })
      } else if (action === 'discontinue' || action === 'restore') {
        await candidateAction('update-status', candidate.enrollment_key, {
          status: action === 'restore' ? 'ACTIVE' : 'SUSPENDED'
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
      } else {
        if (selected.size === 0) throw new Error('Select at least one unpaid book.')
        await candidateAction('manual-purchase', candidate.enrollment_key, {
          months: selected.size,
          exam_keys: [...selected],
          payment_method: paymentMethod
        })
      }
      notify.success('Candidate updated')
      onChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update candidate')
    } finally {
      setSaving(false)
    }
  }

  const title = {
    parcel: 'Prepare ID card and registration books',
    payment: 'Record offline payment',
    password: 'Change password',
    discontinue: 'Discontinue candidate',
    restore: 'Restore candidate'
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
        {action === 'restore' && <p>Restore this candidate as active?</p>}
        {action === 'parcel' &&
          (dispatch ? (
            <>
              <div className="course-tabs">
                {(['send', 'tracking', 'undo'] as const).map((operation) => (
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
                          ? item.dispatched
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
                Registration fee: {options.course.offline_registration_fee} · Price per book:{' '}
                {options.course.offline_month_fee}
              </p>
              <div className="course-choice-list">
                {available.map((exam) => (
                  <label className="course-choice" key={exam.exam_key}>
                    <input
                      type="checkbox"
                      checked={selected.has(exam.exam_key)}
                      onChange={(event) =>
                        setSelected((current) => {
                          const next = new Set(current)
                          if (event.target.checked) next.add(exam.exam_key)
                          else next.delete(exam.exam_key)
                          return next
                        })
                      }
                    />{' '}
                    {exam.sequence}. {exam.title}
                  </label>
                ))}
              </div>
              <p>Total: {Number(options.course.offline_month_fee) * selected.size}</p>
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
              saving || (action === 'parcel' && !dispatch) || (action === 'payment' && !options)
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
