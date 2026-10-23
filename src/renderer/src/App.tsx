import { useEffect, useState } from 'react'
import LoginPage from './features/auth/LoginPage'
import type { Staff } from './features/auth/auth'
import CoursePage from './features/course/CoursePage'
import DashboardPage from './features/dashboard/DashboardPage'
import StorePage from './features/store/StorePage'
import StatusBar from './features/shell/StatusBar'
import TitleBar, { type Page } from './features/shell/TitleBar'
import SplashScreen from './features/shell/SplashScreen'
import { preloadAppResources } from './features/shell/preloadResources'
import { NotificationProvider } from './features/notifications/Notifications'

export default function App(): React.JSX.Element {
  const [staff, setStaff] = useState<Staff | null>(null)
  const [page, setPage] = useState<Page>('dashboard')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    let timer = 0
    const started = performance.now()
    void preloadAppResources()
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

  if (!ready) return <SplashScreen />

  return (
    <NotificationProvider>
      <div className="app">
        <TitleBar page={page} onPage={setPage} showNavigation={!!staff} />
        {staff ? (
          page === 'dashboard' ? (
            <DashboardPage />
          ) : page === 'store' ? (
            <StorePage />
          ) : (
            <CoursePage />
          )
        ) : (
          <LoginPage onLogin={setStaff} />
        )}
        <StatusBar staff={staff} />
      </div>
    </NotificationProvider>
  )
}
