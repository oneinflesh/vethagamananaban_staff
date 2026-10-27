import { authorizedGet, authorizedRequest } from '../auth/auth'

export function getWholeResults(
  courseKey: string,
  country: string,
  page: number,
  search: string,
  state: string,
  district: string
): Promise<unknown> {
  const params = new URLSearchParams({
    course: courseKey,
    country,
    page: String(page),
    page_size: '20'
  })
  if (search) params.set('search', search)
  if (state) params.set('state', state)
  if (district) params.set('district', district)
  return authorizedGet(`staff/course-results/whole/?${params}`)
}

export function saveWholeResults(changes: unknown[]): Promise<unknown> {
  return authorizedRequest('staff/course-results/bulk-score/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ changes })
  })
}
