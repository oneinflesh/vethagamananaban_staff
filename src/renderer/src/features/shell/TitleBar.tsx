import { Button } from '@fluentui/react-components'
import { Dismiss20Regular, Square20Regular, Subtract20Regular } from '@fluentui/react-icons'
export type Page = 'dashboard' | 'store' | 'course'
export default function TitleBar({ page, onPage, showNavigation }: { page: Page; onPage: (page: Page) => void; showNavigation: boolean }): React.JSX.Element {
  return <header className="titlebar"><nav className="title-menu">
    {showNavigation && (['dashboard', 'store', 'course'] as const).map(item => <Button key={item} appearance={page === item ? 'primary' : 'subtle'} onClick={() => onPage(item)}>{item === 'store' ? 'Book Store' : item[0].toUpperCase() + item.slice(1)}</Button>)}
  </nav><div className="drag-region"/><div className="window-controls">
    <Button appearance="subtle" icon={<Subtract20Regular/>} aria-label="Minimize" onClick={() => window.office.minimize()}/>
    <Button appearance="subtle" icon={<Square20Regular/>} aria-label="Maximize" onClick={() => window.office.maximize()}/>
    <Button appearance="subtle" icon={<Dismiss20Regular/>} className="close" aria-label="Close" onClick={() => window.office.close()}/>
  </div></header>
}
