import { authorizedGet, authorizedRequest } from '../auth/auth'

async function readAll<T>(path: string): Promise<T[]> {
  const rows: T[] = []
  let page = 1
  while (true) {
    const response = await authorizedGet<{ count: number; results: T[] }>(
      `${path}${path.includes('?') ? '&' : '?'}page=${page}`
    )
    rows.push(...response.results)
    if (rows.length >= response.count || response.results.length === 0) return rows
    page += 1
  }
}

export const getMonthlySummary = (examKey: string, country: string): Promise<unknown> =>
  authorizedGet(
    `staff/course-exams/${encodeURIComponent(examKey)}/dispatch-summary/?country=${encodeURIComponent(country)}`
  )

export const getMonthlyAllocations = (examKey: string, country: string): Promise<unknown[]> =>
  readAll(
    `staff/course-allocations/?exam=${encodeURIComponent(examKey)}&mode=OFFLINE&active=true&initial_dispatch=completed&country=${encodeURIComponent(country)}`
  )

export const openMonthlyDispatch = (examKey: string, country: string): Promise<unknown> =>
  authorizedRequest(
    `staff/course-exams/${encodeURIComponent(examKey)}/prepare-dispatch/?country=${encodeURIComponent(country)}`,
    {
      method: 'POST'
    }
  )

export const shipMonthlyAllocation = (
  allocationKey: string,
  addressKey: string,
  trackingNumber: string
): Promise<unknown> =>
  authorizedRequest(`staff/course-allocations/${encodeURIComponent(allocationKey)}/dispatch/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(addressKey ? { delivery_address_key: addressKey } : {}),
      tracking_number: trackingNumber
    })
  })

export const saveMonthlyTracking = (
  allocationKey: string,
  trackingNumber: string
): Promise<unknown> =>
  authorizedRequest(`staff/course-allocations/${encodeURIComponent(allocationKey)}/tracking/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tracking_number: trackingNumber })
  })
