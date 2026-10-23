export type EnrolmentPeriod = 'today' | 'week' | 'month' | 'year' | 'custom'

function shiftDate(date: string, days: number): string {
  const shifted = new Date(`${date}T12:00:00Z`)
  shifted.setUTCDate(shifted.getUTCDate() + days)
  return shifted.toISOString().slice(0, 10)
}

export function enrolmentRange(
  today: string,
  period: EnrolmentPeriod,
  customDate: string
): { startDate: string; endDate: string } {
  if (period === 'custom') return { startDate: customDate, endDate: customDate }
  if (period === 'today') return { startDate: today, endDate: today }
  if (period === 'month') return { startDate: `${today.slice(0, 7)}-01`, endDate: today }
  if (period === 'year') return { startDate: `${today.slice(0, 4)}-01-01`, endDate: today }
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay()
  return { startDate: shiftDate(today, -(weekday === 0 ? 6 : weekday - 1)), endDate: today }
}
