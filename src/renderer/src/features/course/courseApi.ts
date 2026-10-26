export type CoordinatorLink = {
  coordinator_key: string
  number: number
  name: string
  bbs_number: string | null
}
export type Candidate = {
  enrollment_key: string
  bbs_identifier: string
  full_name: string
  email: string
  phone: string
  phone2: string
  address: string
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
  parcel_coordinator: { coordinator_key: string; number: number; name: string } | null
  postal_delivery: {
    recipient_name: string
    phone: string
    line1: string
    line2: string
    landmark: string
    city: string
    state: string
    postal_code: string
    country: string
  } | null
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
export type CandidateFilters = {
  state?: string
  district?: string
  initialDispatch?: boolean
  ordering?: string
  search?: string
}
export type CandidateFilterOptions = { statuses: string[]; states: string[]; districts: string[] }
export type CandidateCounts = Record<
  'all' | 'online' | 'offline' | 'discontinued' | 'dropout' | 'finished' | 'newOffline',
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
export type ExamInfo = {
  exam_key: string
  sequence: number
  title: string
  catalog_book_name: string
  scheduled_month: string | null
  is_current: boolean
  is_active: boolean
  is_released: boolean
  course_price_tn: string
  course_price_other: string
  editions: Record<
    string,
    { vn_code: string; name: string; course_price_tn: string; course_price_other: string }
  >
}
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
export type OtherBookOption = {
  exam_key: string
  release_key: string | null
  exam_title: string
  sequence: number
  cycle: number | null
  released: boolean
  active: boolean
  assigned: boolean
  preassigned: boolean
  pending_price: string | null
}
export type OtherBookOptions = {
  books: OtherBookOption[]
  funded_prices: string[]
  funded_book_prices: Record<string, string>
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
  locked_book_prices: Record<string, string>
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
  candidate_role: 'COORDINATOR' | 'UNDER_COORDINATOR' | 'INDIVIDUAL'
  payments: Payment[]
  results: ExamResult[]
}
export type Coordinator = {
  coordinator_key: string
  number: number
  enrollment_key: string | null
  enrollment_status: string | null
  status: 'ACTIVE' | 'SUSPENDED' | 'DROPOUT'
  bbs_number: string
  name: string
  phone: string
  email: string
  address_line1: string
  address_line2: string
  address_line3: string
  district: string
  state: string
  postal_code: string
  country: string
  member_count: number
  active_member_count: number
  discontinued_member_count: number
  dropout_member_count: number
  photo_url: string
}
export type CoordinatorFilters = {
  search?: string
  status?: string
  state?: string
  district?: string
  ordering?: string
}
export type CoordinatorMember = {
  enrollment_key: string
  bbs_number: string
  name: string
  status: string
  phone: string
  address: string
}
export type CoordinatorCandidateOption = {
  enrollment_key: string
  bbs_number: string
  name: string
  district: string
  state: string
  phone: string
  selected: boolean
}
export type CoordinatorCandidatePage = { count: number; results: CoordinatorCandidateOption[] }

export type MonthlyStudent = {
  enrollment_key: string
  bbs_number: string
  name: string
  phone: string
  state: string
  district: string
}
export type MonthlySummary = {
  paid_count: number
  paid_amount: string
  funded_pending_count: number
  funded_pending: MonthlyStudent[]
  unpaid_count: number
  previous_exam_unpaid_count: number
  all_unpaid: MonthlyStudent[]
  previous_exam_unpaid: MonthlyStudent[]
}
export type MonthlyFilters = {
  view: string
  search: string
  status: string
  state: string
  district: string
}
export type MonthlyPage = {
  count: number
  results: (MonthlyAllocation & { kind: 'allocation' | 'funded' })[] | MonthlyStudent[]
  summary: Pick<
    MonthlySummary,
    | 'paid_count'
    | 'paid_amount'
    | 'funded_pending_count'
    | 'unpaid_count'
    | 'previous_exam_unpaid_count'
  >
  filters: { statuses: string[]; states: string[]; districts: string[] }
}
export type MonthlyAllocation = {
  allocation_key: string
  enrollment_key: string
  bbs_number: string
  student_name: string
  student_phone: string
  student_state: string
  student_district: string
  book_number: string
  exam_title: string
  payment_amount: string
  purchased_at: string | null
  status: string
  tracking_number: string
  delivery_address_key: string | null
  delivery_address: {
    city?: string
    state?: string
    postal_code?: string
  } | null
}
export const getCandidates = (
  country: string,
  page: number,
  mode: string,
  status: string,
  search: string,
  filters: CandidateFilters = {}
): Promise<CandidatePage> =>
  window.office.courseCandidates(country, page, mode, status, search, filters)
export const getCandidateFilterOptions = (
  country: string,
  mode: string,
  status: string,
  state = ''
): Promise<CandidateFilterOptions> =>
  window.office.courseCandidateFilterOptions(country, mode, status, state)
export const getCandidateCounts = (country: string): Promise<CandidateCounts> =>
  window.office.courseCandidateCounts(country)
export const getAllCandidates = (
  country: string,
  mode = '',
  status = '',
  pending = false,
  filters: CandidateFilters = {}
): Promise<Candidate[]> =>
  window.office.courseAllCandidates(country, mode, status, pending, filters)
export const getCoordinators = (
  country: string,
  filters: CoordinatorFilters = {}
): Promise<{ count: number; results: Coordinator[] }> =>
  window.office.courseCoordinators(country, filters)
export const getCoordinatorPage = (
  country: string,
  page: number,
  filters: CoordinatorFilters = {}
): Promise<{ count: number; results: Coordinator[] }> =>
  window.office.courseCoordinatorPage(country, page, filters)
export const getCoordinatorFilterOptions = (
  country: string,
  state = ''
): Promise<CandidateFilterOptions> => window.office.courseCoordinatorFilterOptions(country, state)
export const getCoordinatorCount = (country: string): Promise<number> =>
  window.office.courseCoordinatorCount(country)
export const getRegistrationOptions = (): Promise<RegistrationOptions> =>
  window.office.courseRegistrationOptions()
export const createManualRegistration = (courseKey: string, data: unknown): Promise<Candidate> =>
  window.office.courseManualRegistration(courseKey, data)
export const getInitialDispatch = (key: string): Promise<InitialDispatch> =>
  window.office.courseInitialDispatch(key)
export const getOtherBookOptions = (key: string): Promise<OtherBookOptions> =>
  window.office.courseOtherBookOptions(key)
export const candidateAction = (
  action:
    | 'initial-dispatch'
    | 'other-book-dispatch'
    | 'set-password'
    | 'update-status'
    | 'manual-purchase',
  key: string,
  data: unknown
): Promise<unknown> => window.office.courseCandidateAction(action, key, data)
export const updateAllocationScore = (key: string, score: number | null): Promise<unknown> =>
  window.office.courseAllocationScore(key, score)
export const getCandidate = (key: string): Promise<CandidateSummary> =>
  window.office.courseCandidate(key)
export const getCoordinator = (key: string): Promise<Coordinator> =>
  window.office.courseCoordinator(key)
export const createCoordinator = (data: unknown): Promise<Coordinator> =>
  window.office.courseCreateCoordinator(data)
export const updateCoordinator = (key: string, data: unknown): Promise<Coordinator> =>
  window.office.courseUpdateCoordinator(key, data)
export const updateCoordinatorStatus = (
  key: string,
  status: Coordinator['status'],
  keys: string[] = []
): Promise<{ status: string; candidates_changed: number }> =>
  window.office.courseUpdateCoordinatorStatus(key, status, keys)
export const updateCoordinatorMemberStatus = (
  key: string,
  status: 'ACTIVE' | 'SUSPENDED',
  keys: string[]
): Promise<{ status: string; candidates_changed: number }> =>
  window.office.courseUpdateCoordinatorMemberStatus(key, status, keys)
export const setCandidateCoordinator = (key: string, coordinatorKey: string): Promise<unknown> =>
  window.office.courseSetCandidateCoordinator(key, coordinatorKey)
export async function uploadCoordinatorPhoto(key: string, file: File): Promise<Coordinator> {
  return window.office.courseUploadCoordinatorPhoto(
    key,
    new Uint8Array(await file.arrayBuffer()),
    file.name
  )
}
export const getCoordinatorMembers = (key: string): Promise<CoordinatorMember[]> =>
  window.office.courseCoordinatorMembers(key)
export const getCoordinatorMemberPage = (
  key: string,
  page: number,
  search: string,
  restoreOnly: boolean
): Promise<{ count: number; results: CoordinatorMember[] }> =>
  window.office.courseCoordinatorMemberPage(key, page, search, restoreOnly)
export const getCoordinatorCandidateOptions = (
  key: string,
  search: string,
  page: number
): Promise<CoordinatorCandidatePage> =>
  window.office.courseCoordinatorCandidateOptions(key, search, page)
export const updateCoordinatorMembers = (
  key: string,
  additions: string[],
  removals: string[]
): Promise<{ added: number; removed: number }> =>
  window.office.courseCoordinatorUpdateMembers(key, additions, removals)
export const setCoordinatorMembers = (key: string, keys: string[]): Promise<CoordinatorMember[]> =>
  window.office.courseSetCoordinatorMembers(key, keys)
export const getMonthlyPage = (
  examKey: string,
  country: string,
  page: number,
  filters: MonthlyFilters
): Promise<MonthlyPage> => window.office.courseMonthlyPage(examKey, country, page, filters)
export const openMonthlyDispatch = (
  examKey: string,
  country: string
): Promise<{ processing: number }> => window.office.courseMonthlyOpen(examKey, country)
export const shipMonthlyAllocation = (
  allocationKey: string,
  addressKey: string,
  trackingNumber: string
): Promise<MonthlyAllocation> =>
  window.office.courseMonthlyShip(allocationKey, addressKey, trackingNumber)
export const saveMonthlyTracking = (
  allocationKey: string,
  trackingNumber: string
): Promise<MonthlyAllocation> => window.office.courseMonthlyTracking(allocationKey, trackingNumber)
export const updateCandidate = (key: string, data: unknown): Promise<Candidate> =>
  window.office.courseUpdateCandidate(key, data)
export async function uploadPhoto(key: string, file: File): Promise<Candidate> {
  return window.office.courseUploadPhoto(key, new Uint8Array(await file.arrayBuffer()), file.name)
}
