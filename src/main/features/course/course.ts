import { authorizedGet, authorizedRequest } from '../auth/auth'

export function getCandidates(
  country: string,
  page: number,
  mode: string,
  status: string,
  search: string,
  filters: { state?: string; district?: string; initialDispatch?: boolean; ordering?: string } = {}
): Promise<unknown> {
  const params = new URLSearchParams({
    country,
    page: String(page),
    page_size: '20',
    scope: 'course',
    view: 'compact'
  })
  if (mode) params.set('mode', mode)
  if (status) params.set('status', status)
  if (search) params.set('search', search)
  if (filters.state) params.set('state', filters.state)
  if (filters.district) params.set('district', filters.district)
  if (filters.initialDispatch) params.set('initial_dispatch', 'pending')
  if (filters.ordering) params.set('ordering', filters.ordering)
  return authorizedGet(`staff/course-enrollments/?${params}`)
}

export function getPaymentBalances(country: string, page: number, search: string): Promise<unknown> {
  const params = new URLSearchParams({ country, page: String(page) })
  if (search) params.set('search', search)
  return authorizedGet(`staff/course-enrollments/payment-balances/?${params}`)
}

export const getPaymentHistory = (key: string, page: number): Promise<unknown> =>
  authorizedGet(`staff/course-enrollments/${encodeURIComponent(key)}/payment-history/?page=${page}`)

export function getCandidateFilterOptions(
  country: string,
  mode: string,
  status: string,
  state: string
): Promise<unknown> {
  const params = new URLSearchParams({ country, scope: 'course' })
  if (mode) params.set('mode', mode)
  if (status) params.set('status', status)
  if (state) params.set('state', state)
  return authorizedGet(`staff/course-enrollments/filter-options/?${params}`)
}

export async function getCandidateCounts(country: string): Promise<unknown> {
  const pending = new URLSearchParams({
    country,
    scope: 'course',
    view: 'compact',
    mode: 'OFFLINE',
    status: 'ACTIVE',
    initial_dispatch: 'pending',
    page_size: '1'
  })
  const [counts, newOffline] = await Promise.all([
    authorizedGet<Record<string, number>>(
      `staff/course-enrollments/candidate-counts/?country=${encodeURIComponent(country)}`
    ),
    authorizedGet<{ count: number }>(`staff/course-enrollments/?${pending}`)
  ])
  return { ...counts, newOffline: newOffline.count }
}

export const getCandidate = (key: string): Promise<unknown> =>
  authorizedGet(`staff/course-enrollments/${encodeURIComponent(key)}/summary/`)
export async function getAllCandidates(
  country: string,
  mode: string,
  status: string,
  initialDispatch = false,
  filters: { search?: string; state?: string; district?: string } = {}
): Promise<unknown[]> {
  const readPage = (page: number): Promise<{ count: number; results: unknown[] }> => {
    const params = new URLSearchParams({
      country,
      scope: 'course',
      page: String(page),
      page_size: '100',
      view: 'compact'
    })
    if (mode) params.set('mode', mode)
    if (status) params.set('status', status)
    if (initialDispatch) params.set('initial_dispatch', 'pending')
    if (filters.search) params.set('search', filters.search)
    if (filters.state) params.set('state', filters.state)
    if (filters.district) params.set('district', filters.district)
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
  country: string,
  filters: {
    search?: string
    status?: string
    state?: string
    district?: string
    ordering?: string
  } = {}
): Promise<{ count: number; results: unknown[] }> {
  const results: unknown[] = []
  let page = 1
  while (true) {
    const params = new URLSearchParams({ country, page: String(page) })
    for (const [name, value] of Object.entries(filters)) if (value) params.set(name, value)
    const response = await authorizedGet<{ count: number; results: unknown[] }>(
      `staff/course-coordinators/?${params}`
    )
    results.push(...response.results)
    if (results.length >= response.count || response.results.length === 0)
      return { count: response.count, results }
    page += 1
  }
}
export function getCoordinatorPage(
  country: string,
  page: number,
  filters: {
    search?: string
    status?: string
    state?: string
    district?: string
    ordering?: string
  }
): Promise<unknown> {
  const params = new URLSearchParams({ country, page: String(page), page_size: '20' })
  for (const [name, value] of Object.entries(filters)) if (value) params.set(name, value)
  return authorizedGet(`staff/course-coordinators/?${params}`)
}
export function getCoordinatorFilterOptions(country: string, state: string): Promise<unknown> {
  const params = new URLSearchParams({ country })
  if (state) params.set('state', state)
  return authorizedGet(`staff/course-coordinators/filter-options/?${params}`)
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
export const getCurrentCurriculumContent = (examKey: string): Promise<unknown> =>
  authorizedGet(`staff/course-content/?exam=${encodeURIComponent(examKey)}&page_size=100`)
export const setCurrentCurriculumBook = (courseKey: string, sequence: number, country: string): Promise<unknown> =>
  authorizedRequest(`staff/courses/${encodeURIComponent(courseKey)}/release-exam/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sequence, country })
  })
export const setCourseBookActive = (examKey: string, active: boolean): Promise<unknown> =>
  authorizedRequest(`staff/course-exams/${encodeURIComponent(examKey)}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: active })
  })
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
    | 'manual-purchase'
    | 'manual-credit'
    | 'previous-balance'
    | 'credit-and-send'
    | 'restore-wallet-payment',
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
export const updateCoordinatorMemberStatus = (
  key: string,
  status: 'ACTIVE' | 'SUSPENDED',
  enrollmentKeys: string[]
): Promise<unknown> =>
  authorizedRequest(`staff/course-coordinators/${encodeURIComponent(key)}/update-member-status/`, {
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
export const getCoordinatorMemberPage = (
  key: string,
  page: number,
  search: string,
  restoreOnly: boolean
): Promise<unknown> => {
  const params = new URLSearchParams({ page: String(page), page_size: '20' })
  if (search) params.set('search', search)
  if (restoreOnly) params.set('restore_only', 'true')
  return authorizedGet(
    `staff/course-coordinators/${encodeURIComponent(key)}/member-list/?${params}`
  )
}
export const getCoordinatorCandidateOptions = (
  key: string,
  search: string,
  page: number
): Promise<unknown> => {
  const params = new URLSearchParams({ page: String(page), page_size: '20' })
  if (search) params.set('search', search)
  return authorizedGet(
    `staff/course-coordinators/${encodeURIComponent(key)}/candidate-options/?${params}`
  )
}
export const updateCoordinatorMembers = (
  key: string,
  addKeys: string[],
  removeKeys: string[]
): Promise<unknown> =>
  authorizedRequest(`staff/course-coordinators/${encodeURIComponent(key)}/update-members/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ add_keys: addKeys, remove_keys: removeKeys })
  })
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
export const setCandidateCoordinator = (key: string, coordinatorKey: string): Promise<unknown> =>
  authorizedRequest(`staff/course-enrollments/${encodeURIComponent(key)}/set-coordinator/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coordinator_key: coordinatorKey })
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
