import { authorizedGet, authorizedRequest } from '../auth/auth'

export type CourseCountry = { code: string; name: string }

export const getCourseCountries = (): Promise<CourseCountry[]> =>
  authorizedGet('staff/course-countries/')

export const createCourseCountry = (code: string, name: string): Promise<CourseCountry> =>
  authorizedRequest('staff/course-countries/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, name })
  })
