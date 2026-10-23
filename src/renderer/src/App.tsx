import { useState } from 'react'
import LoginPage from './features/auth/LoginPage'
import type { Staff } from './features/auth/auth'
import CoursePage from './features/course/CoursePage'
import DashboardPage from './features/dashboard/DashboardPage'
import StorePage from './features/store/StorePage'
import StatusBar from './features/shell/StatusBar'
import TitleBar, { type Page } from './features/shell/TitleBar'

export default function App(): React.JSX.Element {
  const [staff, setStaff] = useState<Staff | null>(null)
  const [page, setPage] = useState<Page>('dashboard')
  return <div className="app"><TitleBar page={page} onPage={setPage}/>
    {staff ? page === 'dashboard' ? <DashboardPage/> : page === 'store' ? <StorePage/> : <CoursePage/> : <LoginPage onLogin={setStaff}/>}
    <StatusBar staff={staff}/></div>
}
