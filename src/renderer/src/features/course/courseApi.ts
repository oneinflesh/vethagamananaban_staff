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
  wallet_balance: string
  available_funded_books: number
  initial_dispatch_status: string
  registered_at: string
  book_allocations: {
    allocation_key: string
    exam_number: number
    exam_title: string
    status: string
    score: number | null
  }[]
}
export type CandidatePage = { count: number; results: Candidate[] }
export type CandidateCounts = Record<
  'all' | 'online' | 'offline' | 'discontinued' | 'finished' | 'newOffline',
  number
>
export type CourseInfo = {
  course_key: string
  title: string
  offline_registration_fee: string
  offline_month_fee: string
  is_active: boolean
  current_sequence: number
}
export type LanguageInfo = {
  code: string
  name: string
  is_active: boolean
  offline_enabled: boolean
}
export type ExamInfo = { exam_key: string; sequence: number; title: string; is_active: boolean }
export type RegistrationOptions = {
  course: CourseInfo
  languages: LanguageInfo[]
  exams: ExamInfo[]
}
export type DispatchItem = {
  allocation_key: string
  book_number: string
  book_name: string
  dispatched: boolean
  tracking_number: string
  status: string
}
export type InitialDispatch = {
  enrollment_key: string
  bbs_number: string
  student_name: string
  id_card_dispatched: boolean
  id_card_tracking_number: string
  completed: boolean
  wallet_funded?: boolean
  wallet_balance?: string
  items: DispatchItem[]
}
export type Payment = {
  payment_key: string
  paid_at: string | null
  created_at: string
  purpose: string
  method: string
  amount: string
  status: string
  months: number
  wallet_topup: boolean
  locked_book_price: string
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
  enrollment_key: string | null
  bbs_number: string
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
export const getCandidateCounts = (country: string): Promise<CandidateCounts> =>
  window.office.courseCandidateCounts(country)
export const getAllCandidates = (
  country: string,
  mode = '',
  status = '',
  pending = false,
  date = ''
): Promise<Candidate[]> => window.office.courseAllCandidates(country, mode, status, pending, date)
export const getCoordinators = (
  country: string
): Promise<{ count: number; results: Coordinator[] }> => window.office.courseCoordinators(country)
export const getCoordinatorCount = (country: string): Promise<number> =>
  window.office.courseCoordinatorCount(country)
export const getRegistrationOptions = (): Promise<RegistrationOptions> =>
  window.office.courseRegistrationOptions()
export const createManualRegistration = (courseKey: string, data: unknown): Promise<Candidate> =>
  window.office.courseManualRegistration(courseKey, data)
export const getInitialDispatch = (key: string): Promise<InitialDispatch> =>
  window.office.courseInitialDispatch(key)
export const candidateAction = (
  action: 'initial-dispatch' | 'set-password' | 'update-status' | 'manual-purchase',
  key: string,
  data: unknown
): Promise<unknown> => window.office.courseCandidateAction(action, key, data)
export const updateAllocationScore = (key: string, score: number | null): Promise<unknown> =>
  window.office.courseAllocationScore(key, score)
export const getCandidate = (key: string): Promise<CandidateSummary> =>
  window.office.courseCandidate(key)
export const getCoordinator = (key: string): Promise<Coordinator> =>
  window.office.courseCoordinator(key)
export const updateCoordinator = (key: string, data: unknown): Promise<Coordinator> =>
  window.office.courseUpdateCoordinator(key, data)
export const getCoordinatorMembers = (key: string): Promise<CoordinatorMember[]> =>
  window.office.courseCoordinatorMembers(key)
export const updateCandidate = (key: string, data: unknown): Promise<Candidate> =>
  window.office.courseUpdateCandidate(key, data)
export async function uploadPhoto(key: string, file: File): Promise<Candidate> {
  return window.office.courseUploadPhoto(key, new Uint8Array(await file.arrayBuffer()), file.name)
}
