import { authorizedGet, authorizedRequest } from '../auth/auth'

export function getMonthlyPage(
  examKey: string,
  country: string,
  page: number,
  filters: {
    view: string
    search: string
    status: string
    state: string
    district: string
  }
): Promise<unknown> {
  const params = new URLSearchParams({ country, page: String(page), page_size: '20', ...filters })
  return authorizedGet(`staff/course-exams/${encodeURIComponent(examKey)}/dispatch-page/?${params}`)
}

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
