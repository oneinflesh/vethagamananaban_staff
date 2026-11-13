import { useRef } from 'react'
import { useNotifications } from '../notifications/Notifications'
import { candidateAction, type Candidate } from './courseApi'

export default function ManualBookPaymentInput({
  enrollmentKey,
  bbsNumber
}: {
  enrollmentKey: string
  bbsNumber: string
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
      const updated = (await candidateAction('manual-purchase', enrollmentKey, {
        amount: Number(amount).toFixed(2),
        payment_method: 'CASH'
      })) as Candidate
      input.value = ''
      const balance = Number(updated.wallet_balance) - Number(updated.credit_balance)
      const balanceCell = input.closest('tr')?.querySelector<HTMLElement>('[data-dispatch-balance]')
      if (balanceCell) {
        balanceCell.textContent = `${balance < 0 ? '−' : ''}₹${Math.abs(balance).toFixed(2)}`
        balanceCell.className =
          balance < 0 ? 'course-balance--negative' : 'course-balance--positive'
      }
      const paidCell = input.closest('tr')?.querySelector<HTMLElement>('[data-dispatch-paid]')
      if (paidCell) paidCell.textContent = String(updated.books_paid)
      notify.success(`Payment recorded for ${bbsNumber}`)
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
      data-course-cash-payment
      placeholder="₹ Amount"
      aria-label={`Cash payment for ${bbsNumber}`}
      onBlur={(event) => {
        void save(event.currentTarget)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Tab') {
          const inputs = Array.from(
            event.currentTarget
              .closest('.course-manual-dispatch-table')
              ?.querySelectorAll<HTMLInputElement>('input[data-course-cash-payment]') ?? []
          )
          const currentIndex = inputs.indexOf(event.currentTarget)
          const next = inputs[currentIndex + (event.shiftKey ? -1 : 1)]
          if (next) {
            event.preventDefault()
            next.focus()
          }
        }
      }}
    />
  )
}
