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

export async function getStoreStock(_page: number, search: string): Promise<unknown> {
  const params = new URLSearchParams({ page: '1', page_size: '500' })
  if (search) params.set('search', search)
  const first = await authorizedGet(`staff/books/?${params}`) as { count: number; results: unknown[] }
  const results = [...first.results]
  for (let page = 2; results.length < first.count; page += 1) {
    params.set('page', String(page))
    const next = await authorizedGet(`staff/books/?${params}`) as { results: unknown[] }
    if (!next.results.length) break
    results.push(...next.results)
  }
  return { count: first.count, results }
}

export function adjustStoreStock(code: string, stock: number, note: string): Promise<unknown> {
  return authorizedRequest(`staff/books/${encodeURIComponent(code)}/adjust-stock/`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_stock: stock, reason: 'ADMIN_ADJUSTMENT', note })
  })
}

export function getShippingZoneRates(country: string): Promise<unknown> {
  return authorizedGet(`staff/orders/shipping-zone-rates/?country=${encodeURIComponent(country)}`)
}

export function updateShippingZoneRate(rate: unknown): Promise<unknown> {
  return authorizedRequest('staff/orders/shipping-zone-rates/', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rate)
  })
}

export function getStoreCategories(): Promise<unknown> {
  return authorizedGet('staff/categories/')
}
