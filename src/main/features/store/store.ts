import { authorizedGet, authorizedRequest } from '../auth/auth'

export function getStoreParcels(country: string, page: number, filters: Record<string, string>): Promise<unknown> {
  const params = new URLSearchParams({ country, page: String(page), page_size: '20', ...filters })
  return authorizedGet(`staff/orders/dispatch-parcels/?${params}`)
}

export function transitionStoreParcel(orderKeys: string[], status: string, trackingNumber = ''): Promise<unknown> {
  return authorizedRequest('staff/orders/dispatch-batch/', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_keys: orderKeys, status, tracking_number: trackingNumber })
  })
}

export async function getStoreStock(page: number, search: string): Promise<unknown> {
  const params = new URLSearchParams({ page: String(page), page_size: '20' })
  if (search) params.set('search', search)
  return authorizedGet(`staff/books/?${params}`)
}

export function adjustStoreStock(code: string, stock: number, note: string): Promise<unknown> {
  return authorizedRequest(`staff/books/${encodeURIComponent(code)}/adjust-stock/`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_stock: stock, reason: 'ADMIN_ADJUSTMENT', note })
  })
}
