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
    ['offline', 'OFFLINE', 'ACTIVE'],
    ['discontinued', '', 'SUSPENDED'],
    ['dropout', '', 'DROPOUT'],
    ['finished', '', 'COMPLETED'],
    ['newOffline', 'OFFLINE', 'ACTIVE']
  ] as const
  const counts = await Promise.all(
    sections.map(async ([name, mode, status]) => {
      const params = new URLSearchParams({ country, scope: 'course', page_size: '1' })
      if (mode) params.set('mode', mode)
      if (status) params.set('status', status)
      if (name === 'newOffline') params.set('initial_dispatch', 'pending')
      const result = await authorizedGet<{ count: number }>(`staff/course-enrollments/?${params}`)
      return [name, result.count] as const
    })
  )
  return Object.fromEntries(counts)
}

export const getCandidate = (key: string): Promise<unknown> =>
  authorizedGet(`staff/course-enrollments/${encodeURIComponent(key)}/summary/`)
export async function getAllCandidates(
  country: string,
  mode: string,
  status: string,
  initialDispatch = false
): Promise<unknown[]> {
  const readPage = (page: number): Promise<{ count: number; results: unknown[] }> => {
    const params = new URLSearchParams({
      country,
      scope: 'course',
      page: String(page),
      page_size: '100'
    })
    if (mode) params.set('mode', mode)
    if (status) params.set('status', status)
    if (initialDispatch) params.set('initial_dispatch', 'pending')
    return authorizedGet(`staff/course-enrollments/?${params}`)
  }
  const first = await readPage(1)
  const results = [...first.results]
  const pages = Math.ceil(first.count / 100)
  for (let start = 2; start <= pages; start += 3) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(3, pages - start + 1) }, (_, index) => readPage(start + index))
    )
    batch.forEach((response) => results.push(...response.results))
  }
  return results
}
export async function getCoordinators(
  country: string
): Promise<{ count: number; results: unknown[] }> {
  const results: unknown[] = []
  let page = 1
  while (true) {
    const params = new URLSearchParams({ country, page: String(page) })
    const response = await authorizedGet<{ count: number; results: unknown[] }>(
      `staff/course-coordinators/?${params}`
    )
    results.push(...response.results)
    if (results.length >= response.count || response.results.length === 0)
      return { count: response.count, results }
    page += 1
  }
}
export async function getCoordinatorCount(country: string): Promise<number> {
  const params = new URLSearchParams({ country, page: '1' })
  const response = await authorizedGet<{ count: number }>(`staff/course-coordinators/?${params}`)
  return response.count
}
export async function getRegistrationOptions(): Promise<unknown> {
  async function readAll<T>(path: string): Promise<T[]> {
    const results: T[] = []
    let page = 1
    while (true) {
      const response = await authorizedGet<{ count: number; results: T[] }>(
        `${path}${path.includes('?') ? '&' : '?'}page=${page}`
      )
      results.push(...response.results)
      if (results.length >= response.count || response.results.length === 0) return results
      page += 1
    }
  }
  const courses = await readAll<{ course_key: string; is_active: boolean }>('staff/courses/')
  const course = courses.find((item) => item.is_active)
  if (!course) throw new Error('No active course is configured.')
  const [languages, exams] = await Promise.all([
    readAll<unknown>(`staff/course-languages/?course=${course.course_key}`),
    readAll<unknown>(`staff/course-exams/?course=${course.course_key}`)
  ])
  return { course, languages, exams }
}
export const createManualRegistration = (courseKey: string, data: unknown): Promise<unknown> =>
  authorizedRequest(`staff/courses/${encodeURIComponent(courseKey)}/office-enroll/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
export const getInitialDispatch = (key: string): Promise<unknown> =>
  authorizedGet(`staff/course-enrollments/${encodeURIComponent(key)}/initial-dispatch/`)
export const getOtherBookOptions = (key: string): Promise<unknown> =>
  authorizedGet(`staff/course-enrollments/${encodeURIComponent(key)}/other-book-dispatch/`)
export function candidateAction(
  action:
    | 'initial-dispatch'
    | 'other-book-dispatch'
    | 'set-password'
    | 'update-status'
    | 'manual-purchase',
  key: string,
  data: unknown
): Promise<unknown> {
  return authorizedRequest(`staff/course-enrollments/${encodeURIComponent(key)}/${action}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
}
export const updateAllocationScore = (key: string, score: number | null): Promise<unknown> =>
  authorizedRequest(`staff/course-allocations/${encodeURIComponent(key)}/set-score/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score })
  })
export const getCoordinator = (key: string): Promise<unknown> =>
  authorizedGet(`staff/course-coordinators/${encodeURIComponent(key)}/`)
export const createCoordinator = (data: unknown): Promise<unknown> =>
  authorizedRequest('staff/course-coordinators/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
export const updateCoordinator = (key: string, data: unknown): Promise<unknown> =>
  authorizedRequest(`staff/course-coordinators/${encodeURIComponent(key)}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
export const updateCoordinatorStatus = (
  key: string,
  status: 'ACTIVE' | 'SUSPENDED' | 'DROPOUT',
  enrollmentKeys: string[] = []
): Promise<unknown> =>
  authorizedRequest(`staff/course-coordinators/${encodeURIComponent(key)}/update-status/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, enrollment_keys: enrollmentKeys })
  })
export function uploadCoordinatorPhoto(
  key: string,
  bytes: Uint8Array,
  name: string
): Promise<unknown> {
  const form = new FormData()
  const mimeType = name.toLowerCase().endsWith('.png')
    ? 'image/png'
    : name.toLowerCase().endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg'
  form.append('photo', new Blob([new Uint8Array(bytes)], { type: mimeType }), name)
  return authorizedRequest(`staff/course-coordinators/${encodeURIComponent(key)}/photo/`, {
    method: 'POST',
    body: form
  })
}
export const getCoordinatorMembers = (key: string): Promise<unknown> =>
  authorizedGet(`staff/course-coordinators/${encodeURIComponent(key)}/members/`)
export const setCoordinatorMembers = (key: string, enrollmentKeys: string[]): Promise<unknown> =>
  authorizedRequest(`staff/course-coordinators/${encodeURIComponent(key)}/members/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enrollment_keys: enrollmentKeys })
  })
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
