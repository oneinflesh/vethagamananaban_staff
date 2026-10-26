import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import type { DataTableRef } from 'datatables.net-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCountry } from '../country/CountryContext'
import { useNotifications } from '../notifications/Notifications'
import FullScreenLoader from '../shell/FullScreenLoader'
import { useSmoothLoading } from '../shell/useSmoothLoading'
import {
  getShipmentPage,
  markPaperReceived,
  updateTracking,
  type ShipmentFilters,
  type ShipmentPage,
  type ShipmentRow
} from './shippingApi'
import ShippingTable from './ShippingTable'
import './shipping.css'

type SourceFilter = 'all' | 'course' | 'store'

export default function ShippingPage(): React.JSX.Element {
  const { country } = useCountry()
  const notify = useNotifications()
  const table = useRef<DataTableRef>(null)
  const filterReady = useRef(false)
  const requestSequence = useRef(0)
  const { loading, leaving, finish } = useSmoothLoading()
  const [rows, setRows] = useState<ShipmentRow[]>([])
  const [filterOptions, setFilterOptions] = useState<ShipmentPage['filters']>({
    states: [],
    districts: [],
    books: [],
    statuses: []
  })
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [source, setSource] = useState<SourceFilter>('all')
  const [state, setState] = useState('')
  const [district, setDistrict] = useState('')
  const [book, setBook] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [menu, setMenu] = useState<{ x: number; y: number; row: ShipmentRow } | null>(null)
  const [editing, setEditing] = useState<ShipmentRow | null>(null)
  const [showingItems, setShowingItems] = useState<ShipmentRow | null>(null)
  const [tracking, setTracking] = useState('')
  const [saving, setSaving] = useState(false)

  const query = useRef<{ country: string; filters: ShipmentFilters }>({
    country,
    filters: {
      source,
      state,
      district,
      book,
      status,
      dateFrom,
      dateTo,
      search,
      ordering: '-shipped_at'
    }
  })
  useLayoutEffect(() => {
    query.current = {
      country,
      filters: {
        source,
        state,
        district,
        book,
        status,
        dateFrom,
        dateTo,
        search,
        ordering: '-shipped_at'
      }
    }
  }, [country, source, state, district, book, status, dateFrom, dateTo, search])

  async function loadPage(page: number, ordering: string): Promise<ShipmentPage> {
    const sequence = ++requestSequence.current
    try {
      const current = query.current
      const result = await getShipmentPage(current.country, page, { ...current.filters, ordering })
      if (sequence === requestSequence.current) {
        setRows(result.results)
        setFilterOptions(result.filters)
        setError('')
        finish()
      }
      return result
    } catch (cause) {
      if (sequence === requestSequence.current) {
        setError(cause instanceof Error ? cause.message : 'Could not load shipments')
        finish()
      }
      throw cause
    }
  }

  useEffect(() => {
    if (!filterReady.current) {
      filterReady.current = true
      return
    }
    const timer = window.setTimeout(() => table.current?.dt()?.ajax.reload(), search ? 300 : 0)
    return () => window.clearTimeout(timer)
  }, [country, source, state, district, book, status, dateFrom, dateTo, search])

  useEffect(() => {
    if (retry) table.current?.dt()?.ajax.reload(undefined, false)
  }, [retry])

  function openMenu(event: MouseEvent<HTMLDivElement>): void {
    const rowElement = (event.target as HTMLElement).closest('tr')
    const row = rows.find((item) => item.key === rowElement?.id)
    if (!row) return
    event.preventDefault()
    setMenu({
      x: Math.min(event.clientX, window.innerWidth - 225),
      y: Math.min(event.clientY, window.innerHeight - 140),
      row
    })
  }

  function openItems(event: MouseEvent<HTMLDivElement>): void {
    if (!(event.target as HTMLElement).closest('[data-shipping-items]')) return
    const rowId = (event.target as HTMLElement).closest('tr')?.id
    const row = rows.find((item) => item.key === rowId)
    if (row) setShowingItems(row)
  }

  async function reload(): Promise<void> {
    await new Promise<void>((resolve) => table.current?.dt()?.ajax.reload(() => resolve(), false))
  }

  async function saveTracking(): Promise<void> {
    if (!editing || !tracking.trim()) return
    setSaving(true)
    try {
      await updateTracking(editing, tracking.trim())
      setEditing(null)
      await reload()
      notify.success('Tracking ID updated')
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not update tracking')
    } finally {
      setSaving(false)
    }
  }

  async function receivePaper(row: ShipmentRow): Promise<void> {
    setMenu(null)
    if (!window.confirm(`Mark the shipped course books for ${row.reference} as received?`)) return
    setSaving(true)
    try {
      await markPaperReceived(row)
      await reload()
      notify.success('Course book status updated')
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not update status')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page shipping-page" onClick={() => menu && setMenu(null)}>
      <div className="shipping-toolbar">
        <h1>Shipping</h1>
        <div className="shipping-filters">
          <label>
            Source
            <select
              className="shipping-source-filter"
              aria-label="Shipment source"
              value={source}
              onChange={(event) => {
                setSource(event.target.value as SourceFilter)
                setState('')
                setDistrict('')
                setBook('')
                setStatus('')
              }}
            >
              <option value="all">All</option>
              <option value="course">Course</option>
              <option value="store">Book Store</option>
            </select>
          </label>
          <label>
            State
            <select
              value={state}
              onChange={(event) => {
                setState(event.target.value)
                setDistrict('')
              }}
            >
              <option value="">All</option>
              {filterOptions.states.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            District
            <select value={district} onChange={(event) => setDistrict(event.target.value)}>
              <option value="">All</option>
              {filterOptions.districts.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Book
            <select value={book} onChange={(event) => setBook(event.target.value)}>
              <option value="">All</option>
              {filterOptions.books.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All</option>
              {filterOptions.statuses.map((value) => (
                <option key={value}>{value.replaceAll('_', ' ')}</option>
              ))}
            </select>
          </label>
          <label>
            From{' '}
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </label>
          <label>
            To{' '}
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </label>
          <label className="shipping-search">
            Search{' '}
            <input
              type="search"
              value={search}
              placeholder="Name, BBS, tracking..."
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <Button variant="outline" size="sm" onClick={() => setRetry((value) => value + 1)}>
            Refresh
          </Button>
        </div>
      </div>
      {error && <p className="shipping-error">{error}</p>}
      <ShippingTable
        loadPage={loadPage}
        table={table}
        onContextMenu={openMenu}
        onItemsClick={openItems}
      />
      {showingItems && (
        <div className="shipping-dialog-backdrop" onClick={() => setShowingItems(null)}>
          <div className="shipping-dialog" onClick={(event) => event.stopPropagation()}>
            <h2>Items sent</h2>
            <p>
              {showingItems.reference} · {showingItems.recipient}
            </p>
            <ol className="shipping-items-list">
              {showingItems.items.map((item, index) => (
                <li key={`${item.name}-${index}`}>
                  <span>{item.name}</span>
                  <strong>× {item.quantity}</strong>
                </li>
              ))}
            </ol>
            <div className="shipping-dialog-actions">
              <Button type="button" onClick={() => setShowingItems(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      {menu && (
        <div
          className="shipping-context-menu"
          style={{ left: menu.x, top: menu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            onClick={() => {
              setEditing(menu.row)
              setTracking(menu.row.tracking_number)
              setMenu(null)
            }}
          >
            Edit tracking ID
          </button>
          {menu.row.tracking_number.trim() && (
            <button
              onClick={() => {
                const trackingNumber = menu.row.tracking_number
                setMenu(null)
                void window.office
                  .shippingOpenTracking(trackingNumber)
                  .catch((cause) =>
                    notify.error(cause instanceof Error ? cause.message : 'Could not open tracking')
                  )
              }}
            >
              View on courier website
            </button>
          )}
          {menu.row.can_mark_received ? (
            <button onClick={() => void receivePaper(menu.row)}>Mark course book received</button>
          ) : (
            <span>
              {menu.row.source === 'store'
                ? 'Shipped is the final store status'
                : 'No available status change'}
            </span>
          )}
        </div>
      )}
      {editing && (
        <div className="shipping-dialog-backdrop" onClick={() => !saving && setEditing(null)}>
          <form
            className="shipping-dialog"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault()
              void saveTracking()
            }}
          >
            <h2>Edit tracking ID</h2>
            <p>
              {editing.reference} · {editing.recipient}
            </p>
            <Input
              autoFocus
              value={tracking}
              maxLength={100}
              onChange={(event) => setTracking(event.target.value)}
            />
            <div className="shipping-dialog-actions">
              <Button
                variant="outline"
                type="button"
                disabled={saving}
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !tracking.trim()}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </div>
      )}
      {loading && <FullScreenLoader message="Loading shipped parcels" leaving={leaving} />}
    </section>
  )
}
