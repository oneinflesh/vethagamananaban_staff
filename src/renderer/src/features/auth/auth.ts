const base = 'https://api.bible2bible.com/api/v1/'
export type Staff = { full_name: string; username: string; role: string }
export async function login(identifier: string, password: string): Promise<Staff> {
  const response = await fetch(base + 'auth/staff/login/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, password }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || data.message || 'Login failed')
  return data.account as Staff
}
export async function serverConnected(): Promise<boolean> {
  try { await fetch(base + 'auth/staff/login/', { method: 'OPTIONS', signal: AbortSignal.timeout(5000) }); return true } catch { return false }
}
