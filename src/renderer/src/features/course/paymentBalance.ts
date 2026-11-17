export function netPaymentBalance(wallet: string, credit: string): number {
  return Number(wallet) - Number(credit)
}

export function formatSignedAmount(value: number, showPlus = false): string {
  if (!Number.isFinite(value)) return '—'
  return `${value < 0 ? '−' : showPlus ? '+' : ''}₹${Math.abs(value).toFixed(2)}`
}

export function formatPaymentBalance(wallet: string, credit: string): string {
  const balance = netPaymentBalance(wallet, credit)
  return formatSignedAmount(balance)
}

export function paymentBalanceTone(wallet: string, credit: string): string {
  const balance = netPaymentBalance(wallet, credit)
  if (!Number.isFinite(balance)) return ''
  return balance < 0 ? 'course-balance--owed' : balance > 0 ? 'course-balance--available' : ''
}
