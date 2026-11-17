import type { StoreParcel } from './storeApi'

export function summarizeParcelBooks(parcel: StoreParcel): { name: string; quantity: number }[] {
  const books = new Map<string, { name: string; quantity: number }>()
  for (const item of parcel.items) {
    const key = item.vn_code || item.name
    const existing = books.get(key)
    if (existing) existing.quantity += item.quantity
    else books.set(key, { name: item.name, quantity: item.quantity })
  }
  return [...books.values()]
}
