import { useEffect, useState, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { useNotifications } from '../notifications/Notifications'
import {
  adjustStoreStock, getStoreCategories, updateStoreBook, uploadStoreBookCover,
  type StoreBook, type StoreCategory
} from './storeApi'

function imageUrl(path: string): string {
  if (!path) return ''
  return /^https?:\/\//i.test(path) ? path : `https://media.v2.bible2bible.com/${path.replace(/^\/+/, '')}`
}

export default function StoreStockEditor({ book, onSaved }: { book: StoreBook; onSaved: (code: string) => void }): React.JSX.Element {
  const notify = useNotifications()
  const [categories, setCategories] = useState<StoreCategory[]>([])
  const [draft, setDraft] = useState({
    vn_code: book.vn_code, name: book.name, category: book.category,
    description: book.description, isbn: book.isbn, price: book.price,
    discount_price: book.discount_price ?? '', weight_grams: String(book.weight_grams),
    stock: String(book.stock), low_stock_threshold: String(book.low_stock_threshold),
    stockReason: '', is_active: book.is_active, is_trending: book.is_trending,
    is_new_arrival: book.is_new_arrival
  })
  const [cover, setCover] = useState<{ bytes: Uint8Array; name: string } | null>(null)
  const [preview, setPreview] = useState(imageUrl(book.primary_image))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getStoreCategories().then(setCategories).catch(() => {})
  }, [])

  function setField(name: keyof typeof draft, value: string | boolean): void {
    setDraft((current) => ({ ...current, [name]: value }))
  }

  async function chooseCover(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      notify.error('Choose a JPG, PNG or WebP cover')
      event.target.value = ''
      return
    }
    const next = { bytes: new Uint8Array(await file.arrayBuffer()), name: file.name }
    setCover(next)
    setPreview(URL.createObjectURL(file))
    event.target.value = ''
  }

  async function save(): Promise<void> {
    const price = Number(draft.price)
    const discount = draft.discount_price.trim() ? Number(draft.discount_price) : null
    const weight = Number(draft.weight_grams)
    const stock = Number(draft.stock)
    const threshold = Number(draft.low_stock_threshold)
    const code = draft.vn_code.trim().toUpperCase()
    if (!code || code.length > 20 || !draft.name.trim() || !draft.category ||
      !Number.isFinite(price) || price < 0 ||
      (discount !== null && (!Number.isFinite(discount) || discount < 0 || discount >= price)) ||
      !Number.isInteger(weight) || weight < 1 || !Number.isInteger(stock) || stock < 0 ||
      !Number.isInteger(threshold) || threshold < 1 || threshold > 100) {
      notify.error('Check the book code, name, prices, weight and stock')
      return
    }
    if (stock !== book.stock && !draft.stockReason.trim()) {
      notify.error('Enter a reason for the stock adjustment')
      return
    }
    setBusy(true)
    try {
      await updateStoreBook(book.vn_code, {
        vn_code: code, name: draft.name.trim(), category: draft.category,
        description: draft.description.trim(), isbn: draft.isbn.trim(), price,
        discount_price: discount, weight_grams: weight, low_stock_threshold: threshold,
        is_active: draft.is_active, is_trending: draft.is_trending, is_new_arrival: draft.is_new_arrival
      })
      if (stock !== book.stock) await adjustStoreStock(code, stock, draft.stockReason.trim())
      if (cover) await uploadStoreBookCover(code, cover)
      notify.success('Book saved')
      onSaved(code)
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not save book')
      onSaved(book.vn_code)
    } finally { setBusy(false) }
  }

  return <div className="store-stock-editor">
    <div className="store-stock-editor-heading"><h2>{book.name}</h2><span>{book.vn_code}</span></div>
    <div className="store-stock-editor-content">
      <section className="store-stock-panel">
        <h3>Book details</h3>
        <div className="store-stock-fields">
          <label>VN code<input value={draft.vn_code} maxLength={20} onChange={(event) => setField('vn_code', event.target.value)} /></label>
          <label>Category<select value={draft.category} onChange={(event) => setField('category', event.target.value)}>
            {!categories.some((item) => item.slug === draft.category) && <option value={draft.category}>{draft.category}</option>}
            {categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select></label>
          <label className="store-stock-wide">Book name<input value={draft.name} onChange={(event) => setField('name', event.target.value)} /></label>
          <label className="store-stock-wide">Description<textarea rows={3} value={draft.description} onChange={(event) => setField('description', event.target.value)} /></label>
          <label>ISBN<input value={draft.isbn} onChange={(event) => setField('isbn', event.target.value)} /></label>
          <label>Book Store price (₹)<input type="number" min="0" step="0.01" value={draft.price} onChange={(event) => setField('price', event.target.value)} /></label>
          <label>Discount price (₹)<input type="number" min="0" step="0.01" value={draft.discount_price} onChange={(event) => setField('discount_price', event.target.value)} /></label>
          <label>Net weight (g)<input type="number" min="1" value={draft.weight_grams} onChange={(event) => setField('weight_grams', event.target.value)} /></label>
          <label>Current stock<input type="number" min="0" value={draft.stock} onChange={(event) => setField('stock', event.target.value)} /></label>
          <label>Low-stock alert<input type="number" min="1" max="100" value={draft.low_stock_threshold} onChange={(event) => setField('low_stock_threshold', event.target.value)} /></label>
        </div>
        <p>Reserved {book.reserved_stock} · Available {book.available_stock} · Backordered {book.backordered_stock}</p>
        {Number(draft.stock) !== book.stock && <label className="store-stock-reason">Stock adjustment reason<input value={draft.stockReason} onChange={(event) => setField('stockReason', event.target.value)} /></label>}
        <div className="store-stock-flags">
          <label><input type="checkbox" checked={draft.is_active} onChange={(event) => setField('is_active', event.target.checked)} /> Active in catalog</label>
          <label><input type="checkbox" checked={draft.is_trending} onChange={(event) => setField('is_trending', event.target.checked)} /> Trending</label>
          <label><input type="checkbox" checked={draft.is_new_arrival} onChange={(event) => setField('is_new_arrival', event.target.checked)} /> New arrival</label>
        </div>
        <Button disabled={busy} onClick={() => void save()}>Save book</Button>
      </section>
      <section className="store-stock-panel store-stock-cover">
        <h3>Cover</h3>
        {preview ? <img src={preview} alt={`${book.name} cover`} /> : <div className="store-stock-no-cover">No cover</div>}
        <label>Choose cover<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void chooseCover(event)} /></label>
        {cover && <span>{cover.name}</span>}
      </section>
    </div>
  </div>
}
