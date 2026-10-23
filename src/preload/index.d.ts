declare global {
  interface Window {
    office: {
      minimize(): void
      maximize(): void
      close(): void
      ping(): Promise<boolean>
      login(username: string, password: string, remember: boolean): Promise<unknown>
      restoreSession(): Promise<unknown>
      logout(): Promise<void>
      enrolmentSummary(startDate: string, endDate: string, country: string): Promise<unknown>
    }
  }
}
