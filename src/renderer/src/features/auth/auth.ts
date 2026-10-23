export type Staff = { full_name: string; username: string; role: string }
export const login = (identifier: string, password: string): Promise<Staff> =>
  window.office.login(identifier, password)
export const serverConnected = (): Promise<boolean> => window.office.ping()
