import { useRef } from 'react'
import { useNotifications } from '../notifications/Notifications'
import { candidateAction } from './courseApi'

export default function ManualBookPaymentInput({
  enrollmentKey,
  bbsNumber,
  onSaved
}: {
  enrollmentKey: string
  bbsNumber: string
  onSaved: () => void
}): React.JSX.Element {
  const notify = useNotifications()
  const saving = useRef(false)

  async function save(input: HTMLInputElement): Promise<void> {
    const amount = input.value.trim()
    if (!amount || saving.current) return
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) < 1) {
      notify.error('Enter an amount of at least ₹1 with up to two decimal places.')
      return
    }

    saving.current = true
    input.disabled = true
    try {
      await candidateAction('manual-purchase', enrollmentKey, {
        amount: Number(amount).toFixed(2),
        payment_method: 'CASH'
      })
      input.value = ''
      notify.success(`Payment recorded for ${bbsNumber}`)
      onSaved()
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not record payment')
    } finally {
      saving.current = false
      input.disabled = false
    }
  }

  return (
    <input
      className="course-quick-payment course-manual-dispatch-payment"
      type="text"
      inputMode="decimal"
      placeholder="₹ Amount"
      aria-label={`Cash payment for ${bbsNumber}`}
      onBlur={(event) => {
        void save(event.currentTarget)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}
