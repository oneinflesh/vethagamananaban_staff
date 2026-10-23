declare global {
  interface Window {
    office: {
      minimize(): void
      maximize(): void
      close(): void
      ping(): Promise<boolean>
      login(username: string, password: string, remember: boolean): Promise<unknown>
      restoreSession(): Promise<unknown>
      enrolmentSummary(startDate: string, endDate: string): Promise<unknown>
    }
  }
}
