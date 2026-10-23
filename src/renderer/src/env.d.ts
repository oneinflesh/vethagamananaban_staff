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
      search: string
    ): Promise<import('./features/course/courseApi').CandidatePage>
    courseCandidateCounts(
      country: string
    ): Promise<import('./features/course/courseApi').CandidateCounts>
    courseAllCandidates(
      country: string,
      mode: string,
      status: string,
      pending: boolean
    ): Promise<import('./features/course/courseApi').Candidate[]>
    courseCoordinators(
      country: string
    ): Promise<{ count: number; results: import('./features/course/courseApi').Coordinator[] }>
    courseCoordinatorCount(country: string): Promise<number>
    courseRegistrationOptions(): Promise<import('./features/course/courseApi').RegistrationOptions>
    courseManualRegistration(
      courseKey: string,
      data: unknown
    ): Promise<import('./features/course/courseApi').Candidate>
    courseInitialDispatch(
      key: string
    ): Promise<import('./features/course/courseApi').InitialDispatch>
    courseCandidateAction(
      action: 'initial-dispatch' | 'set-password' | 'update-status' | 'manual-purchase',
      key: string,
      data: unknown
    ): Promise<unknown>
    courseAllocationScore(key: string, score: number | null): Promise<unknown>
    courseCandidate(key: string): Promise<import('./features/course/courseApi').CandidateSummary>
    courseCoordinator(key: string): Promise<import('./features/course/courseApi').Coordinator>
    courseUpdateCoordinator(
      key: string,
      data: unknown
    ): Promise<import('./features/course/courseApi').Coordinator>
    courseCoordinatorMembers(
      key: string
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
