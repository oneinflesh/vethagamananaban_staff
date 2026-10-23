import { authorizedGet, authorizedRequest } from '../auth/auth'

export function getCandidates(
  country: string,
  page: number,
  mode: string,
  status: string,
  search: string
): Promise<unknown> {
  const params = new URLSearchParams({
    country,
    page: String(page),
    page_size: '20',
    scope: 'course'
  })
  if (mode) params.set('mode', mode)
  if (status) params.set('status', status)
  if (search) params.set('search', search)
  return authorizedGet(`staff/course-enrollments/?${params}`)
}

export async function getCandidateCounts(country: string): Promise<unknown> {
  const sections = [
    ['all', '', ''],
    ['online', 'ONLINE', ''],
    ['offline', 'OFFLINE', ''],
    ['discontinued', '', 'SUSPENDED'],
    ['finished', '', 'COMPLETED']
  ] as const
  const counts = await Promise.all(
    sections.map(async ([name, mode, status]) => {
      const params = new URLSearchParams({ country, scope: 'course', page_size: '1' })
      if (mode) params.set('mode', mode)
      if (status) params.set('status', status)
      const result = await authorizedGet<{ count: number }>(`staff/course-enrollments/?${params}`)
      return [name, result.count] as const
    })
  )
  return Object.fromEntries(counts)
}

export const getCandidate = (key: string): Promise<unknown> =>
  authorizedGet(`staff/course-enrollments/${encodeURIComponent(key)}/summary/`)
export const getCoordinator = (key: string): Promise<unknown> =>
  authorizedGet(`staff/course-coordinators/${encodeURIComponent(key)}/`)
export const getCoordinatorMembers = (key: string): Promise<unknown> =>
  authorizedGet(`staff/course-coordinators/${encodeURIComponent(key)}/members/`)
export const updateCandidate = (key: string, data: unknown): Promise<unknown> =>
  authorizedRequest(`staff/course-enrollments/${encodeURIComponent(key)}/update-details/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
export function uploadCandidatePhoto(
  key: string,
  bytes: Uint8Array,
  name: string
): Promise<unknown> {
  const form = new FormData()
  const mimeType = name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
  form.append('photo', new Blob([new Uint8Array(bytes)], { type: mimeType }), name)
  return authorizedRequest(`staff/course-enrollments/${encodeURIComponent(key)}/photo/`, {
    method: 'POST',
    body: form
  })
}
