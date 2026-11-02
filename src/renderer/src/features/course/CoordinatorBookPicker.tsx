import { useState } from 'react'
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
  const visible = books.filter((book) => `${book.sequence} ${book.title}`.toLowerCase().includes(search.toLowerCase()))

  function toggle(key: string): void {
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onChange(next)
  }

  return <div className="course-dialog-backdrop" onClick={onClose}>
    <section className="course-dialog course-coordinator-book-picker" role="dialog" aria-modal="true"
      aria-label="Choose books" onClick={(event) => event.stopPropagation()}>
      <div className="course-dialog__header">
        <h2>Choose books</h2>
        <Button variant="outline" onClick={onClose}>Done ({selected.size})</Button>
      </div>
      <Input aria-label="Search books" placeholder="Search books" value={search}
        onChange={(event) => setSearch(event.target.value)} />
      <div className="course-coordinator-book-picker__grid">
        {visible.map((book) => <label key={book.exam_key} className="course-coordinator-book-picker__book">
          <input type="checkbox" checked={selected.has(book.exam_key)} onChange={() => toggle(book.exam_key)} />
          <span><strong>{book.sequence}</strong> {book.title}</span>
        </label>)}
      </div>
    </section>
  </div>
}
