export type CoordinatorLink = { coordinator_key: string; name: string }
export type Candidate = {
  enrollment_key: string
  bbs_identifier: string
  full_name: string
  email: string
  phone: string
  phone2: string
  address_line1: string
  address_line2: string
  address_line3: string
  district: string
  state: string
  postal_code: string
  country: string
  status: string
  mode: string
  language: string
  date_of_birth: string | null
  gender: string
  church_background: string
  church_background_other: string
  education: string
  photo_url: string
  coordinator: CoordinatorLink | null
  paid_books: number
  remaining_books: number
}
export type CandidatePage = { count: number; results: Candidate[] }
export type Payment = {
  payment_key: string
  paid_at: string | null
  created_at: string
  purpose: string
  method: string
  amount: string
  status: string
}
export type ExamResult = {
  exam_key: string
  exam_number: number
  exam_title: string
  mode: string
  status: string
  score: number | null
}
export type CandidateSummary = {
  candidate: Candidate
  total_paid: string
  payment_count: number
  coordinator: CoordinatorLink | null
  payments: Payment[]
  results: ExamResult[]
}
export type Coordinator = {
  coordinator_key: string
  name: string
  phone: string
  email: string
  address_line1: string
  address_line2: string
  district: string
  state: string
  postal_code: string
  country: string
  member_count: number
}
export type CoordinatorMember = {
  enrollment_key: string
  bbs_number: string
  name: string
  phone: string
  address: string
}

export const getCandidates = (
  country: string,
  page: number,
  mode: string,
  status: string,
  search: string
): Promise<CandidatePage> => window.office.courseCandidates(country, page, mode, status, search)
export const getCandidate = (key: string): Promise<CandidateSummary> =>
  window.office.courseCandidate(key)
export const getCoordinator = (key: string): Promise<Coordinator> =>
  window.office.courseCoordinator(key)
export const getCoordinatorMembers = (key: string): Promise<CoordinatorMember[]> =>
  window.office.courseCoordinatorMembers(key)
export const updateCandidate = (key: string, data: unknown): Promise<Candidate> =>
  window.office.courseUpdateCandidate(key, data)
export async function uploadPhoto(key: string, file: File): Promise<Candidate> {
  return window.office.courseUploadPhoto(key, new Uint8Array(await file.arrayBuffer()), file.name)
}
