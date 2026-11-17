import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { DataTableRef } from 'datatables.net-react'
import { Button } from '@/components/ui/button'
import { useCountry } from '../country/CountryContext'
import { useNotifications } from '../notifications/Notifications'
import { useRememberedState } from '../table/tableMemory'
import { getStoreParcels, transitionStoreParcel, type StoreParcel, type StoreParcelPage } from './storeApi'
import StoreParcelTable from './StoreParcelTable'
import StoreStockPage from './StoreStockPage'
import { summarizeParcelBooks } from './storeBookSummary'
import './store.css'

const emptyFilters = { states: [] as string[], districts: [] as string[], books: [] as string[], statuses: [] as string[] }

export default function StorePage(): React.JSX.Element {
  const { country } = useCountry()
  const notify = useNotifications()
  const table = useRef<DataTableRef>(null)
  const [tab, setTab] = useRememberedState<'orders' | 'stock'>('store:tab', 'orders')
  const [status, setStatus] = useRememberedState(`store:${country}:status`, 'PROCESSING')
  const [state, setState] = useRememberedState(`store:${country}:state`, '')
  const [district, setDistrict] = useRememberedState(`store:${country}:district`, '')
  const [book, setBook] = useRememberedState(`store:${country}:book`, '')
  const [search, setSearch] = useRememberedState(`store:${country}:search`, '')
  const [filters, setFilters] = useState(emptyFilters)
  const [selected, setSelected] = useState<StoreParcel | null>(null)
  const [details, setDetails] = useState<{ parcel: StoreParcel; kind: 'orders' | 'books' } | null>(null)
  const [tracking, setTracking] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const query = useRef({ country, status, state, district, book, search })
  const initialized = useRef(false)
  useLayoutEffect(() => {
    query.current = { country, status, state, district, book, search }
  }, [country, status, state, district, book, search])

  useEffect(() => {
    if (!initialized.current) { initialized.current = true; return }
    const timer = window.setTimeout(() => table.current?.dt()?.ajax.reload(), search ? 300 : 0)
    return () => window.clearTimeout(timer)
  }, [country, status, state, district, book, search])

  async function loadPage(page: number, ordering: string): Promise<StoreParcelPage> {
    try {
      const current = query.current
      const result = await getStoreParcels(current.country, page, {
        status: current.status, state: current.state, district: current.district,
        book: current.book, search: current.search, ordering
      })
      setFilters(result.filters)
      setError('')
      return result
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load orders')
      throw cause
    }
  }

  async function advance(parcel: StoreParcel, target: 'PROCESSING' | 'PARCELLED' | 'SHIPPED'): Promise<void> {
    if (busy || (target === 'SHIPPED' && !tracking.trim())) return
    setBusy(true)
    try {
      await transitionStoreParcel(parcel.order_keys, target, tracking.trim())
      setSelected(null)
      setTracking('')
      table.current?.dt()?.ajax.reload(undefined, false)
      notify.success(target === 'PROCESSING' ? 'Stock confirmed' : target === 'PARCELLED' ? 'Orders parcelled' : 'Parcel shipped')
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not update parcel')
    } finally {
      setBusy(false)
    }
  }

  return <section className="page store-page">
    <div className="store-toolbar">
      <h1>Book Store</h1>
      <div className="store-tabs">
        <Button variant={tab === 'orders' ? 'default' : 'outline'} onClick={() => setTab('orders')}>Orders</Button>
        <Button variant={tab === 'stock' ? 'default' : 'outline'} onClick={() => setTab('stock')}>Stock</Button>
      </div>
      {tab === 'orders' && <div className="store-filters">
        <label>Status <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All</option><option value="PROCESSING">Processing</option>
          <option value="REVIEW_REQUIRED">Stock review</option><option value="PARCELLED">Parcelled</option><option value="SHIPPED">Shipped</option>
        </select></label>
        <label>State <select value={state} onChange={(event) => { setState(event.target.value); setDistrict('') }}>
          <option value="">All</option>{filters.states.map((value) => <option key={value}>{value}</option>)}
        </select></label>
        <label>District <select value={district} onChange={(event) => setDistrict(event.target.value)}>
          <option value="">All</option>{filters.districts.map((value) => <option key={value}>{value}</option>)}
        </select></label>
        <label>Book <select value={book} onChange={(event) => setBook(event.target.value)}>
          <option value="">All</option>{filters.books.map((value) => <option key={value}>{value}</option>)}
        </select></label>
        <input aria-label="Search orders" placeholder="Name, VN, order or book" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Button variant="outline" onClick={() => table.current?.dt()?.ajax.reload(undefined, false)}>Refresh</Button>
      </div>}
    </div>
    {tab === 'orders' ? <>
      {error && <p role="alert" className="store-error">{error}</p>}
      <StoreParcelTable key={country} country={country} table={table} loadPage={loadPage} onSelect={setSelected}
        onDetails={(parcel, kind) => setDetails({ parcel, kind })} />
    </> : <StoreStockPage />}
    {details && <div className="store-dialog-backdrop" onClick={() => setDetails(null)}>
      <div className="store-dialog store-dialog--list" role="dialog" aria-modal="true"
        aria-label={details.kind === 'orders' ? 'Order numbers' : 'Books and quantities'}
        onClick={(event) => event.stopPropagation()}>
        <h2>{details.kind === 'orders' ? 'Orders' : 'Books'} · {details.parcel.recipient}</h2>
        <ol>{details.kind === 'orders'
          ? details.parcel.order_numbers.map((number) => <li key={number}>{number}</li>)
          : summarizeParcelBooks(details.parcel).map((item) => <li key={item.name}>{item.name} × {item.quantity}</li>)}</ol>
        <div className="store-dialog-actions"><Button onClick={() => setDetails(null)}>Close</Button></div>
      </div>
    </div>}
    {selected && <div className="store-dialog-backdrop" onClick={() => !busy && setSelected(null)}>
      <div className="store-dialog" role="dialog" aria-modal="true" aria-label="Parcel details" onClick={(event) => event.stopPropagation()}>
        <h2>{selected.vn_number} · {selected.recipient}</h2>
        <p>{selected.order_numbers.join(', ')}</p>
        <p>{[selected.line1, selected.line2, selected.landmark, selected.district, selected.state, selected.postal_code].filter(Boolean).join(', ')}</p>
        <ul>{selected.items.map((item, index) => <li key={`${item.vn_code}:${index}`}>{item.name} × {item.quantity}</li>)}</ul>
        {selected.status === 'PARCELLED' && <label>Tracking ID <input value={tracking} onChange={(event) => setTracking(event.target.value)} autoFocus /></label>}
        <div className="store-dialog-actions">
          <Button variant="outline" onClick={() => setSelected(null)} disabled={busy}>Close</Button>
          {selected.status === 'REVIEW_REQUIRED' && <Button onClick={() => void advance(selected, 'PROCESSING')} disabled={busy}>Confirm stock</Button>}
          {selected.status === 'PROCESSING' && <Button onClick={() => void advance(selected, 'PARCELLED')} disabled={busy}>Mark parcelled</Button>}
          {selected.status === 'PARCELLED' && <Button onClick={() => void advance(selected, 'SHIPPED')} disabled={busy || !tracking.trim()}>Mark shipped</Button>}
        </div>
      </div>
    </div>}
  </section>
}
