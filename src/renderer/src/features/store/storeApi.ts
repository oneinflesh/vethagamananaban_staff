export type StoreParcel = {
  key: string
  order_keys: string[]
  order_numbers: string[]
  vn_number: string
  recipient: string
  phone: string
  line1: string
  line2: string
  landmark: string
  district: string
  state: string
  postal_code: string
  items: { name: string; quantity: number; vn_code: string }[]
  status: 'REVIEW_REQUIRED' | 'PROCESSING' | 'PARCELLED' | 'SHIPPED'
  tracking_number: string
  created_at: string
  shipped_at: string | null
  total: string
}
export type StoreParcelPage = {
  count: number
  results: StoreParcel[]
  filters: { states: string[]; districts: string[]; books: string[]; statuses: string[] }
}
export type StoreBook = {
  vn_code: string
  name: string
  category: string
  description: string
  isbn: string
  price: string
  discount_price: string | null
  weight_grams: number
  primary_image: string
  is_trending: boolean
  is_new_arrival: boolean
  is_active: boolean
  stock: number
  reserved_stock: number
  available_stock: number
  backordered_stock: number
  low_stock_threshold: number
}
export type StoreStockPage = { count: number; results: StoreBook[] }
export type StoreShippingRate = { country: string; state: string; method: 'COURIER' | 'POST'; amount_per_kg: string }
export type StoreCategory = { slug: string; name: string }

export const getStoreParcels = (country: string, page: number, filters: Record<string, string>): Promise<StoreParcelPage> =>
  window.office.storeParcels(country, page, filters)
export const transitionStoreParcel = (keys: string[], status: string, tracking = ''): Promise<unknown> =>
  window.office.storeTransition(keys, status, tracking)
export const getStoreStock = (page: number, search: string): Promise<StoreStockPage> =>
  window.office.storeStock(page, search)
export const adjustStoreStock = (code: string, stock: number, note: string): Promise<unknown> =>
  window.office.storeAdjustStock(code, stock, note)
export const getStoreShippingRates = (country: string): Promise<StoreShippingRate[]> =>
  window.office.storeShippingRates(country)
export const saveStoreShippingRate = (rate: StoreShippingRate): Promise<StoreShippingRate> =>
  window.office.storeShippingRateUpdate(rate)
export const updateStoreBook = (code: string, changes: unknown): Promise<unknown> =>
  window.office.courseBookUpdate(code, changes)
export const uploadStoreBookCover = (code: string, cover: { bytes: Uint8Array; name: string }): Promise<unknown> =>
  window.office.courseBookCover(code, cover)
export const getStoreCategories = (): Promise<StoreCategory[]> => window.office.storeCategories()
