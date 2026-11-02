import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ExamInfo } from './courseApi'

export default function CoordinatorBookPicker({ books, selected, onChange, onClose }: {
  books: ExamInfo[]
  selected: Set<string>
  onChange: (books: Set<string>) => void
  onClose: () => void
}): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [showSelected, setShowSelected] = useState(false)
  const query = search.trim().toLowerCase()
  const visible = books.filter((book) =>
    (!showSelected || selected.has(book.exam_key))
    && `${book.sequence} ${book.title}`.toLowerCase().includes(query))

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  function toggle(key: string): void {
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onChange(next)
  }

  return <div className="course-dialog-backdrop" onClick={onClose}>
    <section className="course-dialog course-coordinator-book-picker" role="dialog" aria-modal="true"
      aria-labelledby="coordinator-book-picker-title" onClick={(event) => event.stopPropagation()}>
      <header className="course-coordinator-book-picker__header">
        <div>
          <h2 id="coordinator-book-picker-title">Choose books</h2>
          <span>{selected.size} selected</span>
        </div>
        <button type="button" className="course-coordinator-book-picker__close" aria-label="Close book picker"
          onClick={onClose}>×</button>
      </header>
      <div className="course-coordinator-book-picker__toolbar">
        <Input autoFocus aria-label="Search books" placeholder="Search by book name or number" value={search}
          onChange={(event) => setSearch(event.target.value)} />
        <div className="course-coordinator-book-picker__tabs" role="group" aria-label="Book filter">
          <button type="button" className={!showSelected ? 'active' : ''}
            aria-pressed={!showSelected} onClick={() => setShowSelected(false)}>All</button>
          <button type="button" className={showSelected ? 'active' : ''}
            aria-pressed={showSelected} onClick={() => setShowSelected(true)}>Selected ({selected.size})</button>
        </div>
      </div>
      <div className="course-coordinator-book-picker__grid">
        {visible.map((book) => <label key={book.exam_key} className="course-coordinator-book-picker__book">
          <input type="checkbox" checked={selected.has(book.exam_key)} onChange={() => toggle(book.exam_key)} />
          <span className="course-coordinator-book-picker__number">{String(book.sequence).padStart(2, '0')}</span>
          <strong>{book.title}</strong>
        </label>)}
        {!visible.length && <p className="course-coordinator-book-picker__empty">No books found</p>}
      </div>
      <footer className="course-coordinator-book-picker__footer">
        <span>{visible.length} books shown</span>
        <div>
          {selected.size > 0 && <Button variant="outline" onClick={() => onChange(new Set())}>Clear selection</Button>}
          <Button onClick={onClose}>Done ({selected.size})</Button>
        </div>
      </footer>
    </section>
  </div>
}
