import { useEffect, useState } from 'react'
import LoginPage from './features/auth/LoginPage'
import { logout, restoreSession, type AuthSession } from './features/auth/auth'
import CoursePage from './features/course/CoursePage'
import DashboardPage from './features/dashboard/DashboardPage'
import StorePage from './features/store/StorePage'
import StatusBar from './features/shell/StatusBar'
import TitleBar, { type Page } from './features/shell/TitleBar'
import SplashScreen from './features/shell/SplashScreen'
import { preloadAppResources } from './features/shell/preloadResources'
import { NotificationProvider } from './features/notifications/Notifications'
import { CountryProvider } from './features/country/CountryContext'

export default function App(): React.JSX.Element {
  const [session, setSession] = useState<AuthSession | null>(null)
  const staff = session?.staff ?? null
  const [page, setPage] = useState<Page>('dashboard')
  const [ready, setReady] = useState(false)
  const [splashComplete, setSplashComplete] = useState(false)

  useEffect(() => {
    let active = true
    let timer = 0
    let finishTimer = 0
    const started = performance.now()
    void Promise.all([preloadAppResources().catch(() => {}), restoreSession().catch(() => null)])
      .then(([, restored]) => {
        if (active && restored) setSession(restored)
      })
      .catch(() => {})
      .finally(() => {
        if (!active) return
        const remaining = Math.max(0, 5000 - (performance.now() - started))
        timer = window.setTimeout(() => {
          if (active) {
            setSplashComplete(true)
            finishTimer = window.setTimeout(() => {
              if (active) setReady(true)
            }, 350)
          }
        }, remaining)
      })
    return () => {
      active = false
      window.clearTimeout(timer)
      window.clearTimeout(finishTimer)
    }
  }, [])

  useEffect(() => {
    if (!session?.expiresAt) return
    const remaining = session.expiresAt - Date.now()
    const timer = window.setTimeout(() => setSession(null), Math.max(0, remaining))
    return () => window.clearTimeout(timer)
  }, [session])

  if (!ready) return <SplashScreen complete={splashComplete} />

  async function handleLogout(): Promise<void> {
    await logout()
    setSession(null)
    setPage('dashboard')
  }

  return (
    <NotificationProvider>
      <CountryProvider>
        <div className="app">
          <TitleBar page={page} onPage={setPage} showNavigation={!!staff} onLogout={handleLogout} />
          {staff ? (
            page === 'dashboard' ? (
              <DashboardPage />
            ) : page === 'store' ? (
              <StorePage />
            ) : (
              <CoursePage />
            )
          ) : (
            <LoginPage onLogin={setSession} />
          )}
          <StatusBar staff={staff} />
        </div>
      </CountryProvider>
    </NotificationProvider>
  )
}
