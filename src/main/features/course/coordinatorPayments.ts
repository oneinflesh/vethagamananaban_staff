import { authorizedGet, authorizedRequest } from '../auth/auth'

export const getCoordinatorWalletMembers = (key: string): Promise<unknown> =>
  authorizedGet(`staff/course-coordinators/${encodeURIComponent(key)}/wallet-members/`)

export const distributeCoordinatorWallet = (key: string, data: unknown): Promise<unknown> =>
  authorizedRequest(`staff/course-coordinators/${encodeURIComponent(key)}/wallet-distribution/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

export const parcelCoordinatorBooks = (key: string, data: unknown): Promise<unknown> =>
  authorizedRequest(`staff/course-coordinators/${encodeURIComponent(key)}/parcel-books/`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  })

export const unsendCoordinatorBooks = (key: string, data: unknown): Promise<unknown> =>
  authorizedRequest(`staff/course-coordinators/${encodeURIComponent(key)}/unsend-books/`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  })
