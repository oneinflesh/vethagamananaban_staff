import { authorizedGet } from '../auth/auth'

type RegistrationSummary = { date: string; count: number }

export function getTodayEnrolment(date: string): Promise<RegistrationSummary> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date')
  return authorizedGet<RegistrationSummary>(
    `staff/course-enrollments/registration-summary/?date=${date}`
  )
}
