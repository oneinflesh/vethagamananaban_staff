export function fieldOptions<T>(rows: T[], field: keyof T): string[] {
  return [...new Set(rows.map((row) => String(row[field] ?? '').trim()).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right)
  )
}

export function statusLabel(status: string): string {
  return (
    {
      ACTIVE: 'Active',
      SUSPENDED: 'Discontinued',
      DROPOUT: 'Dropout',
      COMPLETED: 'Completed',
      PAYMENT_PENDING: 'Payment pending',
      ARCHIVED: 'Archived'
    }[status] ?? status
  )
}
