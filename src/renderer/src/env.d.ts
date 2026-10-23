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
    todayEnrolment(
      date: string
    ): Promise<import('./features/dashboard/dashboardApi').RegistrationSummary>
  }
}
