import { useEffect, useState } from 'react'
import LoginPage from './features/auth/LoginPage'
import { logout, restoreSession, type AuthSession } from './features/auth/auth'
import CoursePage from './features/course/CoursePage'
import DashboardPage from './features/dashboard/DashboardPage'
import StorePage from './features/store/StorePage'
import ShippingPage from './features/shipping/ShippingPage'
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

  useEffect(() => {
    let active = true
    let timer = 0
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
          if (active) setReady(true)
        }, remaining)
      })
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!session?.expiresAt) return
    const remaining = session.expiresAt - Date.now()
    const timer = window.setTimeout(() => setSession(null), Math.max(0, remaining))
    return () => window.clearTimeout(timer)
  }, [session])

  useEffect(() =>
    window.office.onSessionExpired(() => {
      setSession(null)
      setPage('dashboard')
    }), [])

  if (!ready) return <SplashScreen />

  async function handleLogout(): Promise<void> {
    await logout()
    setSession(null)
    setPage('dashboard')
  }

  return (
    <NotificationProvider>
      <CountryProvider enabled={!!staff}>
        <div className="app">
          <TitleBar page={page} onPage={setPage} showNavigation={!!staff} onLogout={handleLogout} />
          {staff ? (
            page === 'dashboard' ? (
              <DashboardPage />
            ) : page === 'store' ? (
              <StorePage />
            ) : page === 'shipping' ? (
              <ShippingPage />
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
