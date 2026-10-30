export function netPaymentBalance(wallet: string, credit: string): number {
  return Number(wallet) - Number(credit)
}

export function formatPaymentBalance(wallet: string, credit: string): string {
  const balance = netPaymentBalance(wallet, credit)
  return `${balance < 0 ? '−' : ''}₹${Math.abs(balance).toFixed(2)}`
}

export function paymentBalanceTone(wallet: string, credit: string): string {
  const balance = netPaymentBalance(wallet, credit)
  return balance < 0 ? 'course-balance--owed' : balance > 0 ? 'course-balance--available' : ''
}
