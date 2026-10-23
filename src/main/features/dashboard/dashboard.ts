import { authorizedGet } from '../auth/auth'

type RegistrationSummary = { start_date: string; end_date: string; count: number }

export function getEnrolmentSummary(
  startDate: string,
  endDate: string
): Promise<RegistrationSummary> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error('Invalid date range')
  }
  return authorizedGet<RegistrationSummary>(
    `staff/course-enrollments/registration-summary/?start_date=${startDate}&end_date=${endDate}`
  )
}
