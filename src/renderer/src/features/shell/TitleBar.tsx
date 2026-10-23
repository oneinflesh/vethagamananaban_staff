export type Page = 'dashboard' | 'store' | 'course'
export default function TitleBar({ page, onPage }: { page: Page; onPage: (page: Page) => void }): React.JSX.Element {
  return <header className="titlebar"><nav className="title-menu">
    {(['dashboard', 'store', 'course'] as const).map(item => <button key={item} className={page === item ? 'selected' : ''} onClick={() => onPage(item)}>{item === 'store' ? 'Book Store' : item[0].toUpperCase() + item.slice(1)}</button>)}
  </nav><div className="drag-region"/><div className="window-controls">
    <button aria-label="Minimize" onClick={() => window.office.minimize()}>─</button>
    <button aria-label="Maximize" onClick={() => window.office.maximize()}>□</button>
    <button className="close" aria-label="Close" onClick={() => window.office.close()}>×</button>
  </div></header>
}
