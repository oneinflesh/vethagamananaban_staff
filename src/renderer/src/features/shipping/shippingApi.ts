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
export type ShipmentPage = {
  count: number
  results: ShipmentRow[]
  filters: { states: string[]; districts: string[]; books: string[]; statuses: string[] }
}

export const getShipmentPage = (
  country: string,
  page: number,
  filters: ShipmentFilters
): Promise<ShipmentPage> => window.office.shippingList(country, page, filters)

export const updateTracking = (row: ShipmentRow, trackingNumber: string): Promise<unknown> =>
  window.office.shippingTracking(row, trackingNumber)

export const markPaperReceived = (row: ShipmentRow): Promise<unknown> =>
  window.office.shippingPaperReceived(row)
