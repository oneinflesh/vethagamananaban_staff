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

export const getShipments = (country: string): Promise<ShipmentRow[]> =>
  window.office.shippingList(country)

export const updateTracking = (row: ShipmentRow, trackingNumber: string): Promise<unknown> =>
  window.office.shippingTracking(row, trackingNumber)

export const markPaperReceived = (row: ShipmentRow): Promise<unknown> =>
  window.office.shippingPaperReceived(row)
