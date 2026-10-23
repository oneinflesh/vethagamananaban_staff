import { Button } from '@/components/ui/button'
import { Minus, Square, X } from 'lucide-react'
export type Page = 'dashboard' | 'store' | 'course'
export default function TitleBar({
  page,
  onPage,
  showNavigation
}: {
  page: Page
  onPage: (page: Page) => void
  showNavigation: boolean
}): React.JSX.Element {
  return (
    <header className="titlebar">
      <nav className="title-menu">
        {showNavigation &&
          (['dashboard', 'store', 'course'] as const).map((item) => (
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
