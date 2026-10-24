import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import type { DataTableRef } from 'datatables.net-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCountry } from '../country/CountryContext'
import { useNotifications } from '../notifications/Notifications'
import FullScreenLoader from '../shell/FullScreenLoader'
import { useSmoothLoading } from '../shell/useSmoothLoading'
import { getShipments, markPaperReceived, updateTracking, type ShipmentRow } from './shippingApi'
import ShippingTable from './ShippingTable'
import './shipping.css'

type SourceFilter = 'all' | 'course' | 'store'

function dateInIndia(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' })
}

function options(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  )
}

export default function ShippingPage(): React.JSX.Element {
  const { country } = useCountry()
  const notify = useNotifications()
  const table = useRef<DataTableRef>(null)
  const pageToRestore = useRef<number | null>(null)
  const { loading, leaving, start, finish } = useSmoothLoading()
  const [rows, setRows] = useState<ShipmentRow[]>([])
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

  useEffect(() => {
    let active = true
    start()
    getShipments(country)
      .then((result) => {
        if (!active) return
        setRows(result)
        setError('')
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load shipments')
      })
      .finally(() => {
        if (active) finish()
      })
    return () => {
      active = false
    }
  }, [country, retry, start, finish])

  useEffect(() => {
    table.current?.dt()?.search(search).draw()
  }, [search])

  useEffect(() => {
    if (pageToRestore.current === null) return
    const page = pageToRestore.current
    pageToRestore.current = null
    window.requestAnimationFrame(() => table.current?.dt()?.page(page).draw('page'))
  }, [rows])

  const sourceRows = useMemo(
    () => rows.filter((row) => source === 'all' || row.source === source),
    [rows, source]
  )
  const stateOptions = useMemo(() => options(sourceRows.map((row) => row.state)), [sourceRows])
  const districtOptions = useMemo(
    () =>
      options(sourceRows.filter((row) => !state || row.state === state).map((row) => row.district)),
    [sourceRows, state]
  )
  const bookOptions = useMemo(() => options(sourceRows.flatMap((row) => row.books)), [sourceRows])
  const statusOptions = useMemo(() => options(sourceRows.map((row) => row.status)), [sourceRows])
  const visibleRows = useMemo(
    () =>
      sourceRows.filter((row) => {
        const date = dateInIndia(row.shipped_at)
        return (
          (!state || row.state === state) &&
          (!district || row.district === district) &&
          (!book || row.books.includes(book)) &&
          (!status || row.status === status) &&
          (!dateFrom || (date && date >= dateFrom)) &&
          (!dateTo || (date && date <= dateTo))
        )
      }),
    [sourceRows, state, district, book, status, dateFrom, dateTo]
  )

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
    pageToRestore.current = table.current?.dt()?.page() ?? 0
    const result = await getShipments(country)
    setRows(result)
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
              {stateOptions.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            District
            <select value={district} onChange={(event) => setDistrict(event.target.value)}>
              <option value="">All</option>
              {districtOptions.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Book
            <select value={book} onChange={(event) => setBook(event.target.value)}>
              <option value="">All</option>
              {bookOptions.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All</option>
              {statusOptions.map((value) => (
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
        rows={visibleRows}
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
