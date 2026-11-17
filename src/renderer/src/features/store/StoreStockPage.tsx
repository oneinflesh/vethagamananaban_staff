import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useNotifications } from '../notifications/Notifications'
import { adjustStoreStock, getStoreStock, type StoreBook } from './storeApi'

export default function StoreStockPage(): React.JSX.Element {
  const notify = useNotifications()
  const [rows, setRows] = useState<StoreBook[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<StoreBook | null>(null)
  const [stock, setStock] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      void getStoreStock(page, search).then((result) => {
        if (active) { setRows(result.results); setCount(result.count) }
      }).catch((error) => { if (active) notify.error(error instanceof Error ? error.message : 'Could not load stock') })
    }, search ? 300 : 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [page, search, refresh, notify])

  async function save(): Promise<void> {
    if (!editing || !/^\d+$/.test(stock) || !note.trim()) return
    setBusy(true)
    try {
      await adjustStoreStock(editing.vn_code, Number(stock), note.trim())
      setEditing(null)
      setNote('')
      setRefresh((value) => value + 1)
      notify.success('Stock updated')
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not update stock')
    } finally { setBusy(false) }
  }

  return <div className="store-stock">
    <div className="store-stock-toolbar"><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search books" aria-label="Search stock" />
      <Button variant="outline" onClick={() => setRefresh((value) => value + 1)}>Refresh</Button></div>
    <div className="store-stock-scroll"><table><thead><tr><th>Book code</th><th>Book</th><th>Stock</th><th>Reserved</th><th>Available</th><th>Backordered</th><th>Low-stock level</th><th></th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.vn_code}><td>{row.vn_code}</td><td>{row.name}</td><td>{row.stock}</td><td>{row.reserved_stock}</td><td>{row.available_stock}</td><td>{row.backordered_stock}</td><td>{row.low_stock_threshold}</td><td><Button variant="outline" onClick={() => { setEditing(row); setStock(String(row.stock)) }}>Adjust</Button></td></tr>)}</tbody></table></div>
    <div className="store-stock-pagination"><span>Page {page} of {Math.max(1, Math.ceil(count / 20))} · {count} books</span><Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" disabled={page * 20 >= count} onClick={() => setPage(page + 1)}>Next</Button></div>
    {editing && <div className="store-dialog-backdrop" onClick={() => !busy && setEditing(null)}><div className="store-dialog" role="dialog" aria-modal="true" aria-label="Adjust stock" onClick={(event) => event.stopPropagation()}>
      <h2>{editing.name}</h2><label>New stock <input type="number" min="0" value={stock} onChange={(event) => setStock(event.target.value)} /></label>
      <label>Reason <input value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <div className="store-dialog-actions"><Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button><Button onClick={() => void save()} disabled={busy || !/^\d+$/.test(stock) || !note.trim() || Number(stock) === editing.stock}>Save stock</Button></div>
    </div></div>}
  </div>
}
