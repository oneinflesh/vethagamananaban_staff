export type WholeResultExam = {
  exam_key: string
  sequence: number
  title: string
  book_number: string
}

export type WholeResultCandidate = {
  enrollment_key: string
  bbs_number: string
  name: string
  mode: 'ONLINE' | 'OFFLINE'
  state: string
  district: string
  cells: Record<string, { editable: boolean; score: number | null }>
}

export type WholeResultsPageData = {
  exams: WholeResultExam[]
  candidates: WholeResultCandidate[]
  count: number
  page: number
  page_size: number
}

export type WholeResultChange = {
  enrollment_key: string
  exam_key: string
  score: number | null
}

export const getWholeResults = (
  courseKey: string,
  country: string,
  page: number,
  search: string,
  state: string,
  district: string
): Promise<WholeResultsPageData> =>
  window.office.courseWholeResults(courseKey, country, page, search, state, district)

export const saveWholeResults = (changes: WholeResultChange[]): Promise<{ saved: number }> =>
  window.office.courseSaveWholeResults(changes)
