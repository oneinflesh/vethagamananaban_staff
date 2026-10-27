import { Button } from '@/components/ui/button'
import { Minus, Square, X } from 'lucide-react'
import { useState } from 'react'
import { useNotifications } from '../notifications/Notifications'
import { useCountry } from '../country/CountryContext'
export type Page = 'dashboard' | 'store' | 'course' | 'shipping'
export default function TitleBar({
  page,
  onPage,
  showNavigation,
  onLogout
}: {
  page: Page
  onPage: (page: Page) => void
  showNavigation: boolean
  onLogout: () => Promise<void>
}): React.JSX.Element {
  const [signingOut, setSigningOut] = useState(false)
  const notify = useNotifications()
  const { country, countries, setCountry } = useCountry()

  async function handleLogout(): Promise<void> {
    setSigningOut(true)
    try {
      await onLogout()
      notify.success('Signed out')
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not sign out')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <header className="titlebar">
      <nav className="title-menu">
        {showNavigation &&
          (['dashboard', 'store', 'course', 'shipping'] as const).map((item) => (
            <Button
              key={item}
              variant={page === item ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onPage(item)}
            >
              {item === 'store' ? 'Book Store' : item[0].toUpperCase() + item.slice(1)}
            </Button>
          ))}
      </nav>
      <div className="drag-region" />
      {showNavigation && (
        <Button variant="ghost" size="sm" disabled={signingOut} onClick={() => void handleLogout()}>
          Logout
        </Button>
      )}
      {showNavigation && (
        <label className="titlebar-country">
          Country
          <select value={country} onChange={(event) => setCountry(event.target.value)}>
            {countries.map(({ code, name }) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="window-controls">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Minimize"
          onClick={() => window.office.minimize()}
        >
          <Minus />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Maximize"
          onClick={() => window.office.maximize()}
        >
          <Square />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close"
          onClick={() => window.office.close()}
        >
          <X />
        </Button>
      </div>
    </header>
  )
}
