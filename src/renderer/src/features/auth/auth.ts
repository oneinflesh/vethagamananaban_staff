export type Staff = { full_name: string; username: string; role: string }
export type AuthSession = { staff: Staff; expiresAt: number | null }
export const login = (
  username: string,
  password: string,
  remember: boolean
): Promise<AuthSession> => window.office.login(username, password, remember)
export const restoreSession = (): Promise<AuthSession | null> => window.office.restoreSession()
export const logout = (): Promise<void> => window.office.logout()
export const serverConnected = (): Promise<boolean> => window.office.ping()
