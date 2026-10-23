export type RegistrationSummary = { date: string; count: number }

export const getTodayEnrolment = (date: string): Promise<RegistrationSummary> =>
  window.office.todayEnrolment(date)

export function indiaDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const value = (type: string): string => parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}
