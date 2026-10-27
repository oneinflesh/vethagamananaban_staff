import { authorizedGet, authorizedRequest } from '../auth/auth'

export function getCourseLanguages(courseKey: string): Promise<unknown> {
  return authorizedGet(
    `staff/course-languages/?course=${encodeURIComponent(courseKey)}&page_size=100`
  )
}

export function createCourseLanguage(
  courseKey: string,
  code: string,
  name: string
): Promise<unknown> {
  return authorizedRequest('staff/course-languages/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      course: courseKey,
      code,
      name,
      available_countries: [],
      is_active: false
    })
  })
}

export function updateLanguageCountries(
  languageKey: string,
  countries: string[]
): Promise<unknown> {
  return authorizedRequest(`staff/course-languages/${encodeURIComponent(languageKey)}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ available_countries: countries })
  })
}

export function updateLanguageAvailability(
  languageKey: string,
  online: boolean,
  offline: boolean
): Promise<unknown> {
  return authorizedRequest(
    `staff/course-languages/${encodeURIComponent(languageKey)}/availability/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ online_enabled: online, offline_enabled: offline })
    }
  )
}
