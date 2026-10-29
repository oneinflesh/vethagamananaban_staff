import { clearSession, loadSession, saveSession } from './session'
import { BrowserWindow } from 'electron'

const apiBase = 'https://api.bible2bible.com/api/v1/'
const rememberDuration = 24 * 60 * 60 * 1000

type Staff = { full_name: string; username: string; role: string }
type LoginResponse = { account: Staff; tokens: { access: string; refresh: string } }
type RefreshResponse = { access: string; refresh?: string }
export type AuthSession = { staff: Staff; expiresAt: number | null }
let accessToken: string | null = null
let refreshToken: string | null = null
let sessionExpiresAt: number | null = null
let refreshPromise: Promise<void> | null = null

function expireSession(): void {
  const hadSession = Boolean(accessToken || refreshToken)
  clearSession()
  accessToken = null
  refreshToken = null
  sessionExpiresAt = null
  if (hadSession) {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send('office:session-expired')
    }
  }
}

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

function apiErrorMessage(data: unknown, status: number): string {
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object') {
    const details = Object.entries(data).flatMap(([field, value]) => {
      const messages = Array.isArray(value) ? value : [value]
      return messages
        .filter((message): message is string => typeof message === 'string' && !!message.trim())
        .map((message) =>
          ['message', 'detail', 'non_field_errors'].includes(field) ? message : `${field}: ${message}`
        )
    })
    if (details.length) return details.join(' ')
  }
  return `Request failed (HTTP ${status}).`
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { ...init, signal: AbortSignal.timeout(15000) })
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(apiErrorMessage(data, response.status), response.status)
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

export function logout(): void {
  const previousAccess = accessToken
  const previousRefresh = refreshToken
  clearSession()
  accessToken = null
  refreshToken = null
  sessionExpiresAt = null
  refreshPromise = null
  if (previousAccess && previousRefresh) {
    void fetch(`${apiBase}auth/logout/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${previousAccess}`
      },
      body: JSON.stringify({ refresh: previousRefresh }),
      signal: AbortSignal.timeout(5000)
    }).catch(() => {})
  }
}

async function performRefresh(): Promise<void> {
  if (!refreshToken || (sessionExpiresAt !== null && Date.now() >= sessionExpiresAt)) {
    expireSession()
    throw new Error('Session expired. Please sign in again.')
  }
  let tokens: RefreshResponse
  try {
    tokens = await request<RefreshResponse>('auth/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken })
    })
  } catch (error) {
    if (error instanceof ApiError && [400, 401, 403].includes(error.status)) {
      expireSession()
      throw new Error('Session expired. Please sign in again.')
    }
    throw error
  }
  accessToken = tokens.access
  if (tokens.refresh) {
    refreshToken = tokens.refresh
    if (sessionExpiresAt !== null) saveSession({ refreshToken, expiresAt: sessionExpiresAt })
  }
}

function refreshAccessToken(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

export async function authorizedRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (sessionExpiresAt !== null && Date.now() >= sessionExpiresAt) {
    expireSession()
  }
  if (!accessToken) throw new Error('Please sign in again.')
  const send = (): Promise<T> =>
    request<T>(path, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${accessToken}` }
    })
  try {
    return await send()
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error
    await refreshAccessToken()
    return send()
  }
}

export const authorizedGet = <T>(path: string): Promise<T> => authorizedRequest<T>(path)

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
