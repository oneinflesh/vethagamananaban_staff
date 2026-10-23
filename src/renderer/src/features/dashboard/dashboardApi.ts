export type RegistrationSummary = { start_date: string; end_date: string; count: number }

export const getEnrolmentSummary = (
  startDate: string,
  endDate: string,
  country: string
): Promise<RegistrationSummary> => window.office.enrolmentSummary(startDate, endDate, country)

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
