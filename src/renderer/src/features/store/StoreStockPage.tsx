import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useNotifications } from '../notifications/Notifications'
import { getStoreStock, type StoreBook } from './storeApi'
import StoreStockEditor from './StoreStockEditor'

export default function StoreStockPage({ country }: { country: string }): React.JSX.Element {
  const notify = useNotifications()
  const [books, setBooks] = useState<StoreBook[]>([])
  const [selected, setSelected] = useState('')
  const [search, setSearch] = useState('')
  const [language, setLanguage] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      void getStoreStock(1, search).then((result) => {
        if (!active) return
        setBooks(result.results)
        setSelected((current) => result.results.some((book) => book.vn_code === current) ? current : (result.results[0]?.vn_code ?? ''))
      }).catch((error) => { if (active) notify.error(error instanceof Error ? error.message : 'Could not load books') })
        .finally(() => { if (active) setLoading(false) })
    }, search ? 250 : 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [search, refresh, notify])

  const languages = [...new Set(books.map((item) => item.language).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const visibleBooks = books.filter((item) => !language || (language === 'unspecified' ? !item.language : item.language === language))
  const book = visibleBooks.find((item) => item.vn_code === selected) ?? visibleBooks[0]
  return <div className="store-stock-layout">
    <aside className="store-stock-sidebar">
      <div className="store-stock-sidebar-heading"><strong>Books · {country}</strong><Button variant="outline" size="sm" onClick={() => setRefresh((value) => value + 1)}>Refresh</Button></div>
      <input aria-label="Search books" placeholder="Search books or VN code" value={search} onChange={(event) => setSearch(event.target.value)} />
      <select aria-label="Filter books by language" className="store-stock-language" value={language} onChange={(event) => setLanguage(event.target.value)}>
        <option value="">All languages</option>
        {languages.map((name) => <option key={name} value={name}>{name}</option>)}
        {books.some((item) => !item.language) && <option value="unspecified">Unspecified</option>}
      </select>
      <nav aria-label="Book list" className="store-stock-book-list">{visibleBooks.map((item) => <button key={item.vn_code} type="button" className={item.vn_code === book?.vn_code ? 'is-selected' : ''} onClick={() => setSelected(item.vn_code)}>
        <span>{item.vn_code}</span><strong>{item.name}</strong><small>{item.available_stock} available</small>
      </button>)}</nav>
      {loading && <span className="store-stock-loading">Loading books…</span>}
    </aside>
    {book ? <StoreStockEditor key={book.vn_code} book={book} onSaved={(code) => { setSelected(code); setRefresh((value) => value + 1) }} /> : <div className="store-stock-empty">{loading ? 'Loading books…' : 'No books found'}</div>}
  </div>
}
