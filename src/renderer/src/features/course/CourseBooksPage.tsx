import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNotifications } from '../notifications/Notifications'
import FullScreenLoader from '../shell/FullScreenLoader'
import { useSmoothLoading } from '../shell/useSmoothLoading'
import {
  adjustCourseBookStock,
  getCourseBooks,
  saveCourseBookTranslation,
  updateCourseBook,
  uploadCourseBookCover,
  type CourseBooksData
} from './courseBooksApi'
import './courseBooks.css'

type SharedDraft = {
  name: string
  description: string
  isbn: string
  storePrice: string
  discountPrice: string
  priceTn: string
  priceOther: string
  weight: string
  stock: string
  stockReason: string
  lowStockThreshold: string
  isTrending: boolean
  isNewArrival: boolean
  isActive: boolean
}

function coverUrl(path: string): string {
  if (!path) return ''
  return /^https?:\/\//i.test(path)
    ? path
    : `https://media.v2.bible2bible.com/${path.replace(/^\/+/, '')}`
}

export default function CourseBooksPage({
  country,
  onBack
}: {
  country: string
  onBack: () => void
}): React.JSX.Element {
  const notify = useNotifications()
  const { loading, leaving, start, finish } = useSmoothLoading()
  const [data, setData] = useState<CourseBooksData | null>(null)
  const [error, setError] = useState('')
  const [languageKey, setLanguageKey] = useState('')
  const [examKey, setExamKey] = useState('')
  const [shared, setShared] = useState<SharedDraft | null>(null)
  const [sharedCover, setSharedCover] = useState<{ bytes: Uint8Array; name: string } | null>(null)
  const [sharedCoverPreview, setSharedCoverPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)

  function fillDrafts(result: CourseBooksData, nextExamKey: string, nextLanguageKey: string): void {
    const selectedExam = result.exams.find((item) => item.exam_key === nextExamKey)
    const selectedTranslation = result.translations.find(
      (item) => item.exam === nextExamKey && item.language === nextLanguageKey
    )
    const selectedBook = result.books.find(
      (item) => item.vn_code === (selectedTranslation?.catalog_book || selectedExam?.catalog_book)
    )
    setShared(
      selectedBook
        ? {
            name: selectedBook.name ?? '',
            description: selectedBook.description ?? '',
            isbn: selectedBook.isbn ?? '',
            storePrice: selectedBook.price ?? '',
            discountPrice: selectedBook.discount_price ?? '',
            priceTn: selectedBook.course_price_tn ?? '',
            priceOther: selectedBook.course_price_other ?? '',
            weight: String(selectedBook.weight_grams),
            stock: String(selectedBook.stock),
            stockReason: '',
            lowStockThreshold: String(selectedBook.low_stock_threshold),
            isTrending: selectedBook.is_trending,
            isNewArrival: selectedBook.is_new_arrival,
            isActive: selectedBook.is_active
          }
        : null
    )
    setSharedCover(null)
    setSharedCoverPreview(coverUrl(selectedBook?.primary_image ?? ''))
  }

  async function reload(): Promise<void> {
    const result = await getCourseBooks()
    setData(result)
    const nextLanguage = result.languages.some((item) => item.language_key === languageKey)
      ? languageKey
      : (result.languages[0]?.language_key ?? '')
    const nextExam = result.exams.some((item) => item.exam_key === examKey)
      ? examKey
      : ([...result.exams].sort((a, b) => a.sequence - b.sequence)[0]?.exam_key ?? '')
    setLanguageKey(nextLanguage)
    setExamKey(nextExam)
    fillDrafts(result, nextExam, nextLanguage)
  }

  useEffect(() => {
    let active = true
    start()
    getCourseBooks()
      .then((result) => {
        if (!active) return
        setData(result)
        const firstLanguage = ''
        const firstExam =
          [...result.exams].sort((a, b) => a.sequence - b.sequence)[0]?.exam_key ?? ''
        setLanguageKey(firstLanguage)
        setExamKey(firstExam)
        fillDrafts(result, firstExam, firstLanguage)
        setError('')
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load course books')
      })
      .finally(() => {
        if (active) finish()
      })
    return () => {
      active = false
    }
  }, [retry, start, finish])

  const exams = useMemo(
    () => [...(data?.exams ?? [])].sort((a, b) => a.sequence - b.sequence),
    [data]
  )
  const exam = exams.find((item) => item.exam_key === examKey)
  const translation = data?.translations.find(
    (item) => item.exam === examKey && item.language === languageKey
  )
  const book = data?.books.find(
    (item) => item.vn_code === (translation?.catalog_book || exam?.catalog_book)
  )
  const selectedLanguage = data?.languages.find((item) => item.language_key === languageKey)
  const tamilLanguage =
    selectedLanguage?.code?.toLowerCase().startsWith('ta') ||
    selectedLanguage?.name.toLowerCase().includes('tamil')

  async function selectCover(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      notify.error('Choose a JPG, PNG, or WebP cover')
      event.target.value = ''
      return
    }
    const selected = { bytes: new Uint8Array(await file.arrayBuffer()), name: file.name }
    setSharedCover(selected)
    setSharedCoverPreview(URL.createObjectURL(file))
    event.target.value = ''
  }

  async function saveShared(): Promise<void> {
    if (!book || !shared || !exam || !languageKey) return
    const weight = Number(shared.weight)
    const stock = Number(shared.stock)
    const priceTn = shared.priceTn.trim() === '' ? null : Number(shared.priceTn)
    const priceOther = shared.priceOther.trim() === '' ? null : Number(shared.priceOther)
    const storePrice = Number(shared.storePrice)
    const discountPrice = shared.discountPrice.trim() === '' ? null : Number(shared.discountPrice)
    const lowStockThreshold = Number(shared.lowStockThreshold)
    if (
      !shared.name.trim() ||
      !Number.isInteger(weight) ||
      weight < 1 ||
      !Number.isInteger(stock) ||
      stock < 0 ||
      !Number.isInteger(lowStockThreshold) ||
      lowStockThreshold < 1 ||
      lowStockThreshold > 100 ||
      !Number.isFinite(storePrice) ||
      storePrice < 0 ||
      (discountPrice !== null &&
        (!Number.isFinite(discountPrice) || discountPrice < 0 || discountPrice >= storePrice)) ||
      (priceTn !== null && (!Number.isFinite(priceTn) || priceTn < 0)) ||
      (priceOther !== null && (!Number.isFinite(priceOther) || priceOther < 0))
    ) {
      notify.error('Enter a book name and valid prices, weight, and stock')
      return
    }
    if (stock !== book.stock && !shared.stockReason.trim()) {
      notify.error('Enter a reason for the stock adjustment')
      return
    }
    setBusy(true)
    try {
      await updateCourseBook(book.vn_code, {
        name: shared.name.trim(),
        description: shared.description.trim(),
        isbn: shared.isbn.trim(),
        price: storePrice,
        discount_price: discountPrice,
        course_price_tn: priceTn,
        course_price_other: priceOther,
        weight_grams: weight,
        low_stock_threshold: lowStockThreshold,
        is_trending: shared.isTrending,
        is_new_arrival: shared.isNewArrival,
        is_active: shared.isActive
      })
      if (stock !== book.stock) {
        await adjustCourseBookStock(book.vn_code, stock, shared.stockReason.trim())
      }
      if (sharedCover) await uploadCourseBookCover(book.vn_code, sharedCover)
      await saveCourseBookTranslation(
        translation?.id ?? null,
        exam.exam_key,
        languageKey,
        shared.name.trim(),
        shared.description.trim(),
        null
      )
      await reload()
      notify.success('Book edition saved')
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not save shared details')
      void reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="page course-page course-books-page">
      <div className="course-books-heading">
        <Button variant="outline" size="sm" onClick={onBack}>
          ← Course
        </Button>
        <h1>Course books</h1>
        <label>
          Language
          <select
            value={languageKey}
            onChange={(event) => {
              setLanguageKey(event.target.value)
              if (data) fillDrafts(data, examKey, event.target.value)
            }}
          >
            <option value="">Select language</option>
            {data?.languages.map((item) => (
              <option key={item.language_key} value={item.language_key}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <Button variant="outline" size="sm" onClick={() => setRetry((value) => value + 1)}>
          Refresh
        </Button>
      </div>
      {error && <p className="course-error">{error}</p>}
      {!error && data && !languageKey && (
        <p className="course-error">
          {data.languages.length
            ? 'Select a language to manage its books for the country in the title bar.'
            : 'Create a course language first.'}
        </p>
      )}
      {data && languageKey && !selectedLanguage?.available_countries.includes(country) && (
        <p className="course-error">
          This language is not available in the selected country. Add the country in Language and
          Country first.
        </p>
      )}
      {data && languageKey && selectedLanguage?.available_countries.includes(country) && (
        <div className="course-books-layout">
          <nav className="course-books-list" aria-label="Course books">
            {exams.map((item) => {
              return (
                <button
                  type="button"
                  key={item.exam_key}
                  className={
                    item.exam_key === examKey
                      ? 'course-books-list-item is-selected'
                      : 'course-books-list-item'
                  }
                  onClick={() => {
                    setExamKey(item.exam_key)
                    fillDrafts(data, item.exam_key, languageKey)
                  }}
                >
                  <span>{String(item.sequence).padStart(2, '0')}</span>
                  <strong>{item.title}</strong>
                </button>
              )
            })}
          </nav>
          {exam && book ? (
            <div className="course-books-editors">
              <section
                className={`course-books-panel${tamilLanguage ? ' course-books-panel--tamil' : ''}`}
              >
                <h2>{selectedLanguage?.name} book details</h2>
                <div className="course-books-fields">
                  <label>
                    VN code
                    <Input value={book.vn_code} readOnly />
                  </label>
                  <label>
                    Category
                    <Input value={book.category} readOnly />
                  </label>
                  <label className="course-books-field-wide">
                    Book name
                    <Input
                      value={shared?.name ?? ''}
                      onChange={(event) =>
                        setShared((current) => current && { ...current, name: event.target.value })
                      }
                    />
                  </label>
                  <label className="course-books-field-wide">
                    Description
                    <textarea
                      value={shared?.description ?? ''}
                      onChange={(event) =>
                        setShared(
                          (current) => current && { ...current, description: event.target.value }
                        )
                      }
                      rows={3}
                    />
                  </label>
                  <label>
                    ISBN
                    <Input
                      value={shared?.isbn ?? ''}
                      onChange={(event) =>
                        setShared((current) => current && { ...current, isbn: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Book Store price (₹)
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={shared?.storePrice ?? ''}
                      onChange={(event) =>
                        setShared(
                          (current) => current && { ...current, storePrice: event.target.value }
                        )
                      }
                    />
                  </label>
                  <label>
                    Book Store discount price (₹)
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={shared?.discountPrice ?? ''}
                      onChange={(event) =>
                        setShared(
                          (current) => current && { ...current, discountPrice: event.target.value }
                        )
                      }
                    />
                  </label>
                  <label>
                    Course price · Tamil Nadu (₹)
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={shared?.priceTn ?? ''}
                      onChange={(event) =>
                        setShared(
                          (current) => current && { ...current, priceTn: event.target.value }
                        )
                      }
                    />
                  </label>
                  <label>
                    Course price · Other (₹)
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={shared?.priceOther ?? ''}
                      onChange={(event) =>
                        setShared(
                          (current) => current && { ...current, priceOther: event.target.value }
                        )
                      }
                    />
                  </label>
                  <label>
                    Net weight (g)
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={shared?.weight ?? ''}
                      onChange={(event) =>
                        setShared(
                          (current) => current && { ...current, weight: event.target.value }
                        )
                      }
                    />
                  </label>
                  <label>
                    Current stock
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={shared?.stock ?? ''}
                      onChange={(event) =>
                        setShared((current) => current && { ...current, stock: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Low-stock alert threshold
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      value={shared?.lowStockThreshold ?? ''}
                      onChange={(event) =>
                        setShared(
                          (current) =>
                            current && { ...current, lowStockThreshold: event.target.value }
                        )
                      }
                    />
                  </label>
                </div>
                <p>
                  Reserved: {book.reserved_stock} · Available: {book.available_stock} · Backordered:{' '}
                  {book.backordered_stock}
                </p>
                <div className="course-books-options">
                  <label>
                    <input
                      type="checkbox"
                      checked={shared?.isActive ?? false}
                      onChange={(event) =>
                        setShared(
                          (current) => current && { ...current, isActive: event.target.checked }
                        )
                      }
                    />{' '}
                    Active in catalog
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={shared?.isTrending ?? false}
                      onChange={(event) =>
                        setShared(
                          (current) => current && { ...current, isTrending: event.target.checked }
                        )
                      }
                    />{' '}
                    Trending in Book Store
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={shared?.isNewArrival ?? false}
                      onChange={(event) =>
                        setShared(
                          (current) => current && { ...current, isNewArrival: event.target.checked }
                        )
                      }
                    />{' '}
                    New arrival in Book Store
                  </label>
                </div>
                {shared && Number(shared.stock) !== book.stock && (
                  <label className="course-books-stock-reason">
                    Stock adjustment reason
                    <Input
                      value={shared.stockReason}
                      onChange={(event) =>
                        setShared(
                          (current) => current && { ...current, stockReason: event.target.value }
                        )
                      }
                    />
                  </label>
                )}
                <Button disabled={busy || !shared} onClick={() => void saveShared()}>
                  Save book details
                </Button>
              </section>
              <section className="course-books-panel course-books-panel--covers">
                <h2>Covers</h2>
                <div className="course-books-cover">
                  {sharedCoverPreview && (
                    <img src={sharedCoverPreview} alt={`${selectedLanguage?.name} book cover`} />
                  )}
                  <label>
                    {selectedLanguage?.name} cover
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => void selectCover(event)}
                    />
                    {sharedCover?.name && <span>{sharedCover.name}</span>}
                  </label>
                </div>
                <Button
                  variant="outline"
                  disabled={busy || !sharedCover}
                  onClick={() => void saveShared()}
                >
                  Save cover
                </Button>
              </section>
            </div>
          ) : (
            <p className="course-error">This course month has no matching catalog book.</p>
          )}
        </div>
      )}
      {loading && <FullScreenLoader message="Loading course books" leaving={leaving} />}
    </section>
  )
}
