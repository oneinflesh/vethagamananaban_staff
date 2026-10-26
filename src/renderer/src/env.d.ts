/// <reference types="vite/client" />
interface Window {
  office: {
    minimize(): void
    maximize(): void
    close(): void
    ping(): Promise<boolean>
    login(
      username: string,
      password: string,
      remember: boolean
    ): Promise<import('./features/auth/auth').AuthSession>
    restoreSession(): Promise<import('./features/auth/auth').AuthSession | null>
    logout(): Promise<void>
    enrolmentSummary(
      startDate: string,
      endDate: string,
      country: string
    ): Promise<import('./features/dashboard/dashboardApi').RegistrationSummary>
    courseCandidates(
      country: string,
      page: number,
      mode: string,
      status: string,
      search: string,
      filters: import('./features/course/courseApi').CandidateFilters
    ): Promise<import('./features/course/courseApi').CandidatePage>
    courseCandidateFilterOptions(
      country: string,
      mode: string,
      status: string,
      state: string
    ): Promise<import('./features/course/courseApi').CandidateFilterOptions>
    courseCandidateCounts(
      country: string
    ): Promise<import('./features/course/courseApi').CandidateCounts>
    courseBooks(): Promise<import('./features/course/courseBooksApi').CourseBooksData>
    courseBookUpdate(code: string, changes: unknown): Promise<unknown>
    courseBookCover(code: string, cover: { bytes: Uint8Array; name: string }): Promise<unknown>
    courseBookStock(code: string, stock: number, note: string): Promise<unknown>
    courseBookTranslation(
      id: number | null,
      exam: string,
      language: string,
      title: string,
      description: string,
      cover: { bytes: Uint8Array; name: string } | null
    ): Promise<unknown>
    shippingList(
      country: string,
      page: number,
      filters: import('./features/shipping/shippingApi').ShipmentFilters
    ): Promise<import('./features/shipping/shippingApi').ShipmentPage>
    shippingTracking(
      row: import('./features/shipping/shippingApi').ShipmentRow,
      trackingNumber: string
    ): Promise<unknown>
    shippingOpenTracking(trackingNumber: string): Promise<void>
    shippingPaperReceived(
      row: import('./features/shipping/shippingApi').ShipmentRow
    ): Promise<unknown>
    courseAllCandidates(
      country: string,
      mode: string,
      status: string,
      pending: boolean,
      filters: import('./features/course/courseApi').CandidateFilters
    ): Promise<import('./features/course/courseApi').Candidate[]>
    courseCoordinators(
      country: string,
      filters: import('./features/course/courseApi').CoordinatorFilters
    ): Promise<{ count: number; results: import('./features/course/courseApi').Coordinator[] }>
    courseCoordinatorPage(
      country: string,
      page: number,
      filters: import('./features/course/courseApi').CoordinatorFilters
    ): Promise<{ count: number; results: import('./features/course/courseApi').Coordinator[] }>
    courseCoordinatorFilterOptions(
      country: string,
      state: string
    ): Promise<import('./features/course/courseApi').CandidateFilterOptions>
    courseCoordinatorCount(country: string): Promise<number>
    courseRegistrationOptions(): Promise<import('./features/course/courseApi').RegistrationOptions>
    courseManualRegistration(
      courseKey: string,
      data: unknown
    ): Promise<import('./features/course/courseApi').Candidate>
    courseInitialDispatch(
      key: string
    ): Promise<import('./features/course/courseApi').InitialDispatch>
    courseOtherBookOptions(
      key: string
    ): Promise<import('./features/course/courseApi').OtherBookOptions>
    courseCandidateAction(
      action:
        | 'initial-dispatch'
        | 'other-book-dispatch'
        | 'set-password'
        | 'update-status'
        | 'manual-purchase',
      key: string,
      data: unknown
    ): Promise<unknown>
    courseAllocationScore(key: string, score: number | null): Promise<unknown>
    courseCandidate(key: string): Promise<import('./features/course/courseApi').CandidateSummary>
    courseCoordinator(key: string): Promise<import('./features/course/courseApi').Coordinator>
    courseCreateCoordinator(
      data: unknown
    ): Promise<import('./features/course/courseApi').Coordinator>
    courseUpdateCoordinator(
      key: string,
      data: unknown
    ): Promise<import('./features/course/courseApi').Coordinator>
    courseUpdateCoordinatorStatus(
      key: string,
      status: 'ACTIVE' | 'SUSPENDED' | 'DROPOUT',
      keys: string[]
    ): Promise<{ status: string; candidates_changed: number }>
    courseUploadCoordinatorPhoto(
      key: string,
      bytes: Uint8Array,
      name: string
    ): Promise<import('./features/course/courseApi').Coordinator>
    courseCoordinatorMembers(
      key: string
    ): Promise<import('./features/course/courseApi').CoordinatorMember[]>
    courseCoordinatorCandidateOptions(
      key: string,
      search: string,
      page: number
    ): Promise<import('./features/course/courseApi').CoordinatorCandidatePage>
    courseCoordinatorUpdateMembers(
      key: string,
      additions: string[],
      removals: string[]
    ): Promise<{ added: number; removed: number }>
    courseSetCoordinatorMembers(
      key: string,
      keys: string[]
    ): Promise<import('./features/course/courseApi').CoordinatorMember[]>
    courseUpdateCandidate(
      key: string,
      data: unknown
    ): Promise<import('./features/course/courseApi').Candidate>
    courseUploadPhoto(
      key: string,
      bytes: Uint8Array,
      name: string
    ): Promise<import('./features/course/courseApi').Candidate>
    courseMonthlySummary(
      examKey: string,
      country: string
    ): Promise<import('./features/course/courseApi').MonthlySummary>
    courseMonthlyAllocations(
      examKey: string,
      country: string
    ): Promise<import('./features/course/courseApi').MonthlyAllocation[]>
    courseMonthlyOpen(examKey: string, country: string): Promise<{ processing: number }>
    courseMonthlyShip(
      allocationKey: string,
      addressKey: string,
      trackingNumber: string
    ): Promise<import('./features/course/courseApi').MonthlyAllocation>
    courseMonthlyTracking(
      allocationKey: string,
      trackingNumber: string
    ): Promise<import('./features/course/courseApi').MonthlyAllocation>
  }
}
