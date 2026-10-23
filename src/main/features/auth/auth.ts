import { clearSession, loadSession, saveSession } from './session'

const apiBase = 'https://api.bible2bible.com/api/v1/'
const rememberDuration = 24 * 60 * 60 * 1000

type Staff = { full_name: string; username: string; role: string }
type LoginResponse = { account: Staff; tokens: { access: string; refresh: string } }
type RefreshResponse = { access: string; refresh?: string }
export type AuthSession = { staff: Staff; expiresAt: number | null }
let accessToken: string | null = null
let refreshToken: string | null = null
let sessionExpiresAt: number | null = null

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { ...init, signal: AbortSignal.timeout(15000) })
  const data = await response.json()
  if (!response.ok)
    throw new ApiError(data.message || data.detail || 'Sign-in failed', response.status)
  return data as T
}

export async function login(
  username: string,
  password: string,
  remember: boolean
): Promise<AuthSession> {
  const data = await request<LoginResponse>('auth/staff/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: username, password })
  })
  clearSession()
  accessToken = data.tokens.access
  refreshToken = data.tokens.refresh
  sessionExpiresAt = null
  if (!remember) return { staff: data.account, expiresAt: null }
  const expiresAt = Date.now() + rememberDuration
  saveSession({ refreshToken: data.tokens.refresh, expiresAt })
  sessionExpiresAt = expiresAt
  return { staff: data.account, expiresAt }
}

async function refreshAccessToken(): Promise<void> {
  if (!refreshToken || (sessionExpiresAt !== null && Date.now() >= sessionExpiresAt)) {
    accessToken = null
    throw new Error('Session expired. Please sign in again.')
  }
  const tokens = await request<RefreshResponse>('auth/refresh/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: refreshToken })
  })
  accessToken = tokens.access
  if (tokens.refresh) {
    refreshToken = tokens.refresh
    if (sessionExpiresAt !== null) saveSession({ refreshToken, expiresAt: sessionExpiresAt })
  }
}

export async function authorizedGet<T>(path: string): Promise<T> {
  if (sessionExpiresAt !== null && Date.now() >= sessionExpiresAt) {
    accessToken = null
    refreshToken = null
    clearSession()
  }
  if (!accessToken) throw new Error('Please sign in again.')
  const get = (): Promise<T> =>
    request<T>(path, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  try {
    return await get()
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error
    await refreshAccessToken()
    return get()
  }
}

let restoration: Promise<AuthSession | null> | null = null

export function restoreSession(): Promise<AuthSession | null> {
  if (!restoration) {
    restoration = restoreSavedSession().finally(() => {
      restoration = null
    })
  }
  return restoration
}

async function restoreSavedSession(): Promise<AuthSession | null> {
  const saved = loadSession()
  if (!saved) return null
  try {
    const tokens = await request<RefreshResponse>('auth/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: saved.refreshToken })
    })
    const staff = await request<Staff>('accounts/me/', {
      headers: { Authorization: `Bearer ${tokens.access}` }
    })
    if (!['ADMIN', 'STAFF'].includes(staff.role)) {
      clearSession()
      return null
    }
    if (tokens.refresh) saveSession({ refreshToken: tokens.refresh, expiresAt: saved.expiresAt })
    accessToken = tokens.access
    refreshToken = tokens.refresh || saved.refreshToken
    sessionExpiresAt = saved.expiresAt
    return { staff, expiresAt: saved.expiresAt }
  } catch (error) {
    if (error instanceof ApiError && [400, 401, 403].includes(error.status)) clearSession()
    return null
  }
}
