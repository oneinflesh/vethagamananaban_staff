import { Button } from '@/components/ui/button'
import type { CoordinatorMember } from './courseApi'

function sentDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata'
  }).format(new Date(value)).replaceAll('/', '-')
}

export default function CoordinatorSentBooksDialog({ person, onClose }: {
  person: CoordinatorMember
  onClose: () => void
}): React.JSX.Element {
  return <div className="course-dialog-backdrop" onClick={onClose}>
    <section className="course-dialog coordinator-sent-books-dialog" role="dialog" aria-modal="true"
      aria-label={`Books sent to ${person.bbs_number} ${person.name}`} onClick={(event) => event.stopPropagation()}>
      <div className="course-dialog__header">
        <h2>Books sent · {person.bbs_number} {person.name}</h2>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
      <div className="coordinator-sent-books-list">
        {person.sent_books.map((book, index) => <div key={`${book.dispatched_at}:${index}`}>
          <span>{book.title}</span>
          <time dateTime={book.dispatched_at}>{sentDate(book.dispatched_at)}</time>
        </div>)}
      </div>
    </section>
  </div>
}
