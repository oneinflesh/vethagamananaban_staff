import { app, safeStorage } from 'electron'
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

const sessionPath = (): string => join(app.getPath('userData'), 'staff-session.bin')

export type SavedSession = { refreshToken: string; expiresAt: number }

export function clearSession(): void {
  try {
    unlinkSync(sessionPath())
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}

export function saveSession(session: SavedSession): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Secure storage is unavailable. Cannot remember this sign-in.')
  }
  writeFileSync(sessionPath(), safeStorage.encryptString(JSON.stringify(session)))
}

export function loadSession(): SavedSession | null {
  try {
    if (!safeStorage.isEncryptionAvailable()) return null
    const saved = JSON.parse(safeStorage.decryptString(readFileSync(sessionPath()))) as SavedSession
    if (
      typeof saved.refreshToken !== 'string' ||
      !Number.isFinite(saved.expiresAt) ||
      saved.expiresAt <= Date.now()
    ) {
      clearSession()
      return null
    }
    return saved
  } catch {
    clearSession()
    return null
  }
}
