export type OperationsGroup = 'individual' | 'member' | 'coordinator' | 'range'
export type OperationsMetadata = {
  country: string
  fields: { key: string; label: string }[]
  books: { key: string; sequence: number; title: string }[]
  bbs_range: { from: number | null; to: number | null }
}
export type OperationsRange = { from: number; to: number } | null
export type OperationsTemplate = { filename: string; csv: string; rows: number }
export type OperationsChange = {
  row: number
  identifier: string
  field: string
  label: string
  before: string
  after: string
}
export type OperationsError = { row: number; field: string; message: string }
export type OperationsPreview = {
  rows: number
  change_count: number
  changes: OperationsChange[]
  errors: OperationsError[]
  error_count: number
  token: string
}
export type OperationsApply = { operation_key: string; rows: number; changes: number }
export type OperationsHistoryItem = {
  operation_key: string
  filename: string
  group: OperationsGroup
  actor: string
  created_at: string
  row_count: number
  change_count: number
}
export type OperationsHistory = { count: number; page: number; results: OperationsHistoryItem[] }
export type OperationsHistoryDetails = {
  count: number
  page: number
  results: {
    identifier: string
    field: string
    before: string
    after: string
    record_key: string
  }[]
}

export const getOperationsMetadata = (country: string): Promise<OperationsMetadata> =>
  window.office.courseOperationsMetadata(country)
export const getOperationsTemplate = (
  country: string,
  group: OperationsGroup,
  fields: string[],
  books: string[],
  bbsRange: OperationsRange
): Promise<OperationsTemplate> =>
  window.office.courseOperationsTemplate(country, group, fields, books, bbsRange)
export const uploadOperations = (
  action: 'preview' | 'apply',
  country: string,
  group: OperationsGroup,
  bytes: Uint8Array,
  filename: string,
  token = '',
  bbsRange: OperationsRange = null
): Promise<OperationsPreview & OperationsApply> =>
  window.office.courseOperationsUpload(action, country, group, bytes, filename, token, bbsRange)
export const getOperationsHistory = (country: string, page: number): Promise<OperationsHistory> =>
  window.office.courseOperationsHistory(country, page)
export const getOperationsHistoryDetails = (
  key: string,
  page: number
): Promise<OperationsHistoryDetails> => window.office.courseOperationsHistoryDetails(key, page)
