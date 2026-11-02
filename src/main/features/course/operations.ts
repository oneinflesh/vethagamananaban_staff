import { authorizedGet, authorizedRequest } from '../auth/auth'

const base = 'staff/course-operations/'

export const getOperationsMetadata = (country: string): Promise<unknown> =>
  authorizedGet(`${base}?country=${encodeURIComponent(country)}`)

export const makeOperationsTemplate = (
  country: string,
  group: string,
  fields: string[],
  examKeys: string[]
): Promise<unknown> =>
  authorizedRequest(`${base}template/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ country, group, fields, exam_keys: examKeys })
  })

export const uploadOperationsCsv = (
  action: 'preview' | 'apply',
  country: string,
  group: string,
  bytes: Uint8Array,
  filename: string,
  token = ''
): Promise<unknown> => {
  const form = new FormData()
  form.append('country', country)
  form.append('group', group)
  form.append('token', token)
  form.append('file', new Blob([Uint8Array.from(bytes)], { type: 'text/csv' }), filename)
  return authorizedRequest(`${base}${action}/`, { method: 'POST', body: form })
}

export const getOperationsHistory = (country: string, page: number): Promise<unknown> =>
  authorizedGet(`${base}history/?country=${encodeURIComponent(country)}&page=${page}`)

export const getOperationsHistoryDetails = (key: string, page: number): Promise<unknown> =>
  authorizedGet(`${base}history/${encodeURIComponent(key)}/?page=${page}`)
