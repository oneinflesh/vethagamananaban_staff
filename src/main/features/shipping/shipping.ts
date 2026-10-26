import { authorizedGet, authorizedRequest } from '../auth/auth'

export type ShipmentFilters = {
  source: 'all' | 'course' | 'store'
  state: string
  district: string
  book: string
  status: string
  dateFrom: string
  dateTo: string
  search: string
  ordering: string
}

export type ShipmentRow = {
  key: string
  source: 'course' | 'store'
  reference: string
  recipient: string
  phone: string
  district: string
  state: string
  book_names: string
  books: string[]
  items: { name: string; quantity: number }[]
  status: string
  tracking_number: string
  shipped_at: string | null
  enrollment_key: string | null
  allocation_keys: string[]
  receivable_keys: string[]
  includes_id_card: boolean
  can_mark_received: boolean
  order_key: string | null
  members: {
    enrollment_key: string
    bbs_number: string
    name: string
    allocation_keys: string[]
    receivable_keys: string[]
    includes_id_card: boolean
  }[]
}

export type ShipmentPage = {
  count: number
  results: ShipmentRow[]
  filters: { states: string[]; districts: string[]; books: string[]; statuses: string[] }
}

export function getShipmentPage(
  country: string,
  page: number,
  filters: ShipmentFilters
): Promise<ShipmentPage> {
  const params = new URLSearchParams({
    country,
    page: String(page),
    page_size: '20',
    source: filters.source,
    ordering: filters.ordering
  })
  if (filters.state) params.set('state', filters.state)
  if (filters.district) params.set('district', filters.district)
  if (filters.book) params.set('book', filters.book)
  if (filters.status) params.set('status', filters.status)
  if (filters.dateFrom) params.set('date_from', filters.dateFrom)
  if (filters.dateTo) params.set('date_to', filters.dateTo)
  if (filters.search) params.set('search', filters.search)
  return authorizedGet(`staff/shipping-parcels/?${params}`)
}

export async function updateShipmentTracking(
  row: ShipmentRow,
  trackingNumber: string
): Promise<void> {
  if (row.source === 'store') {
    await authorizedRequest(`staff/orders/${encodeURIComponent(row.order_key!)}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracking_number: trackingNumber })
    })
    return
  }
  for (const member of row.members) {
    await authorizedRequest(
      `staff/course-enrollments/${encodeURIComponent(member.enrollment_key)}/parcel-tracking/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracking_number: trackingNumber,
          allocation_keys: member.allocation_keys,
          include_id_card: member.includes_id_card
        })
      }
    )
  }
}

export async function markCoursePaperReceived(row: ShipmentRow): Promise<void> {
  if (row.source !== 'course' || !row.can_mark_received) {
    throw new Error('This parcel has no shipped course book to update.')
  }
  for (const member of row.members.filter((item) => item.receivable_keys.length)) {
    await authorizedRequest(
      `staff/course-enrollments/${encodeURIComponent(member.enrollment_key)}/parcel-paper-received/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocation_keys: member.receivable_keys })
      }
    )
  }
}
