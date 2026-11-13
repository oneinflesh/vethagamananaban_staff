import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import type { DataTableRef } from 'datatables.net-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNotifications } from '../notifications/Notifications'
import { DataTable, Column } from './dataTable'
import {
  candidateAction,
  getCandidates,
  getCoordinatorPage,
  getCoordinatorWalletMembers,
  getOtherBookOptions,
  getRegistrationOptions,
  type Candidate,
  type Coordinator,
  type CoordinatorWalletMember,
  type ExamInfo
} from './courseApi'
import useDispatchTableHeight from './useDispatchTableHeight'
import CoordinatorBookPicker from './CoordinatorBookPicker'
import ManualBookSendButton from './ManualBookSendButton'
import ManualBookPaymentInput from './ManualBookPaymentInput'
import { ManualBookSendContext } from './manualBookSendContext'
import { getManualDispatchHistory } from './manualBookDispatchHistory'
import ManualBookMemberCheckbox from './ManualBookMemberSelection'
import { ManualBookMemberSelectionContext } from './manualBookMemberSelectionContext'

export default function ManualBookDispatchPage({
  country,
  onCandidate,
  onCoordinator,
  onBack
}: {
  country: string
  onCandidate: (key: string) => void
  onCoordinator: (key: string) => void
  onBack: () => void
}): React.JSX.Element {
  const [recipientType, setRecipientType] = useState<'individual' | 'coordinator'>(() => getManualDispatchHistory(country).recipientType)
  const [search, setSearch] = useState(() => getManualDispatchHistory(country).search)
  const [members, setMembers] = useState<CoordinatorWalletMember[]>([])
  const [coordinator, setCoordinator] = useState<Coordinator | null>(null)
  const [loading, setLoading] = useState(false)
  const [books, setBooks] = useState<ExamInfo[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(() => new Set(getManualDispatchHistory(country).selectedBooks))
  const [sentCandidates, setSentCandidates] = useState<Set<string>>(new Set())
  const [choosingBooks, setChoosingBooks] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendingCandidate, setSendingCandidate] = useState<string | null>(null)
  const [memberRefresh, setMemberRefresh] = useState(0)
  const [resendMenu, setResendMenu] = useState<{ key: string; bbs: string; x: number; y: number } | null>(null)
  const recipientTable = useRef<DataTableRef>(null)
  const recipientRows = useRef<Candidate[]>([])
  const sendingCandidateRef = useRef(false)
  const notify = useNotifications()
  const pageRef = useDispatchTableHeight(`${recipientType}:${coordinator?.coordinator_key ?? ''}`)
  const selectedSequences = useMemo(() => new Set(books.filter((book) => selectedBooks.has(book.exam_key)).map((book) => book.sequence)), [books, selectedBooks])
  const visibleMembers = useMemo(() => members.filter((member) =>
    `${member.bbs_number} ${member.name}`.toLowerCase().includes(search.toLowerCase())
  ), [members, search])
  const allVisibleSelected = visibleMembers.length > 0 && visibleMembers.every((member) => selectedMembers.has(member.enrollment_key))

  function toggleMember(key: string): void {
    setSelectedMembers((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleVisibleMembers(): void {
    setSelectedMembers((current) => {
      const next = new Set(current)
      for (const member of visibleMembers) {
        if (allVisibleSelected) next.delete(member.enrollment_key)
        else next.add(member.enrollment_key)
      }
      return next
    })
  }

  function selectCoordinatorPeople(row: Coordinator): void {
    const scrollBody = recipientTable.current?.dt()?.table().container().querySelector<HTMLElement>('.dt-scroll-body')
    getManualDispatchHistory(country).coordinatorScrollTop = scrollBody?.scrollTop ?? 0
    setLoading(true)
    setSelectedMembers(new Set())
    setCoordinator(row)
  }

  function changeRecipientType(type: 'individual' | 'coordinator'): void {
    const saved = getManualDispatchHistory(country)
    saved.recipientType = type
    saved.search = ''
    setRecipientType(type)
    setSearch('')
    setCoordinator(null)
    setSelectedMembers(new Set())
  }

  function changeSearch(value: string): void {
    const saved = getManualDispatchHistory(country)
    saved.search = value
    saved.starts[recipientType] = 0
    if (recipientType === 'coordinator' && !coordinator) saved.coordinatorScrollTop = 0
    setSearch(value)
  }

  function openResendMenu(event: MouseEvent<HTMLDivElement>): void {
    const key = (event.target as HTMLElement).closest('tr')?.id
    if (!key) return
    const person = coordinator
      ? members.find((item) => item.enrollment_key === key)
      : recipientType === 'individual' ? recipientRows.current.find((item) => item.enrollment_key === key) : null
    if (!person) return
    event.preventDefault()
    setResendMenu({ key, bbs: 'bbs_number' in person ? person.bbs_number : person.bbs_identifier,
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 250)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 55)) })
  }

  useEffect(() => {
    let active = true
    getRegistrationOptions().then((options) => {
      if (active) setBooks(options.exams.filter((book) => book.is_active))
    }).catch((error) => {
      if (active) notify.error(error instanceof Error ? error.message : 'Could not load books')
    })
    return () => { active = false }
  }, [country, notify])

  useEffect(() => {
    if (!coordinator) return
    let active = true
    getCoordinatorWalletMembers(coordinator.coordinator_key).then((result) => {
      if (active) {
        const activeMembers = result.filter((member) => member.status === 'ACTIVE' && member.mode === 'OFFLINE')
        setMembers(activeMembers)
      }
    }).catch((error) => {
      if (active) notify.error(error instanceof Error ? error.message : 'Could not load people')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [coordinator, memberRefresh, notify])

  async function sendToCoordinator(): Promise<void> {
    if (!coordinator || !selectedBooks.size || selectedSequences.size !== selectedBooks.size || !selectedMembers.size || sending) return
    setSending(true)
    try {
      const keys = [...selectedMembers]
      const examKeys = [...selectedBooks]
      const options = await Promise.all(keys.map((key) => getOtherBookOptions(key)))
      const stockByBook = new Map<number, { required: number; stock: number }>()
      const ineligible = keys.filter((_, index) => {
        const chosen = examKeys.map((examKey) => options[index].manual_books.find((item) => item.exam_key === examKey))
          .filter((book) => !book?.already_sent)
        const invalid = chosen.some((book) => !book || !book.active || book.price === null || book.stock < 1)
        for (const book of chosen) {
          if (book?.book_id == null) continue
          const current = stockByBook.get(book.book_id) ?? { required: 0, stock: book.stock }
          current.required += 1
          current.stock = Math.min(current.stock, book.stock)
          stockByBook.set(book.book_id, current)
        }
        const total = chosen.reduce((sum, book) => sum + Number(book?.price ?? 0), 0)
        return invalid || (chosen.length > 0 && !options[index].manual_address) || !Number.isFinite(total)
      })
      if (ineligible.length) {
        notify.error(`${ineligible.length} selected people cannot receive these books. No books were sent.`)
        return
      }
      if ([...stockByBook.values()].some(({ required, stock }) => required > stock)) {
        notify.error('Not enough stock for every selected person. No books were sent.')
        return
      }
      let sent = 0
      let booksSent = 0
      const parcelBatch = crypto.randomUUID()
      for (const key of keys) {
        try {
          const allocations = await candidateAction('manual-book-dispatch', key, {
            exam_keys: examKeys, tracking_number: '', allow_credit: true, parcel_batch: parcelBatch
          }) as unknown[]
          booksSent += allocations.length
          sent += 1
        } catch (error) {
          notify.error(`${sent} sent; ${keys.length - sent} not sent. ${error instanceof Error ? error.message : 'Dispatch failed'}`)
          setSelectedMembers(new Set(keys.slice(sent)))
          if (sent) setMemberRefresh((value) => value + 1)
          return
        }
      }
      notify.success(booksSent ? `${booksSent} books parcelled under C-${coordinator.number}` : 'Selected books are already sent or in dispatch')
      setSelectedMembers(new Set())
      setMemberRefresh((value) => value + 1)
    } finally {
      setSending(false)
    }
  }

  async function sendToCandidate(row: Candidate): Promise<void> {
    if (!selectedBooks.size || selectedSequences.size !== selectedBooks.size || sendingCandidateRef.current || sentCandidates.has(row.enrollment_key)) return
    sendingCandidateRef.current = true
    setSendingCandidate(row.enrollment_key)
    try {
      const allocations = await candidateAction('manual-book-dispatch', row.enrollment_key, {
        exam_keys: [...selectedBooks], tracking_number: '', allow_credit: true
      }) as unknown[]
      const count = allocations.length
      notify.success(count ? `${count} book${count === 1 ? '' : 's'} parcelled for ${row.bbs_identifier}` : 'Selected books are already sent or in dispatch')
      setSentCandidates((current) => new Set(current).add(row.enrollment_key))
      recipientTable.current?.dt()?.ajax.reload(undefined, false)
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not send books')
    } finally {
      sendingCandidateRef.current = false
      setSendingCandidate(null)
    }
  }

  async function resendSelectedBooks(key: string, bbs: string): Promise<void> {
    if (!selectedBooks.size || selectedSequences.size !== selectedBooks.size || sendingCandidateRef.current) return
    sendingCandidateRef.current = true
    setSendingCandidate(key)
    try {
      const allocations = await candidateAction('manual-book-dispatch', key, {
        exam_keys: [...selectedBooks], tracking_number: '', allow_credit: true, resend: true
      }) as unknown[]
      notify.success(`${allocations.length} book${allocations.length === 1 ? '' : 's'} resent to ${bbs}`)
      if (coordinator) setMemberRefresh((value) => value + 1)
      else recipientTable.current?.dt()?.ajax.reload(undefined, false)
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not resend books')
    } finally {
      sendingCandidateRef.current = false
      setSendingCandidate(null)
    }
  }

  function signedAmount(value: number): string {
    return `${value < 0 ? '−' : ''}₹${Math.abs(value).toFixed(2)}`
  }

  return <section ref={pageRef} className="page course-page course-manual-dispatch-page"
    onClick={() => { if (resendMenu) setResendMenu(null) }}>
    <div className="course-toolbar course-toolbar--manual-dispatch">
      <Button variant="outline" onClick={coordinator ? () => { setCoordinator(null); setSelectedMembers(new Set()) } : onBack}>← Course</Button>
      <h1>Send released books</h1>
      <Button variant="outline" disabled={!books.length || sending || !!sendingCandidate}
        onClick={() => setChoosingBooks(true)}>Choose books ({selectedBooks.size})</Button>
      <div className="course-manual-dispatch-tabs" role="tablist" aria-label="Recipient type">
        <button type="button" role="tab" aria-selected={recipientType === 'individual'}
          className={recipientType === 'individual' ? 'active' : ''}
          onClick={() => changeRecipientType('individual')}>Individual</button>
        <button type="button" role="tab" aria-selected={recipientType === 'coordinator'}
          className={recipientType === 'coordinator' ? 'active' : ''}
          onClick={() => changeRecipientType('coordinator')}>Coordinator</button>
      </div>
      <Input className="course-manual-dispatch-search" aria-label="Search recipients"
        placeholder={coordinator ? 'Search members' : 'Search name or number'} value={search}
        onChange={(event) => changeSearch(event.target.value)} />
    </div>
    {coordinator ? <>
      <h2>{coordinator.name} · C-{coordinator.number}</h2>
      <p className="course-manual-dispatch-address">
        Parcel address: {coordinator.address_line1 || 'No address'}, {coordinator.district}, {coordinator.state} {coordinator.postal_code}
      </p>
      <div className="course-manual-dispatch-controls">
        <Button variant="outline" disabled={!visibleMembers.length || sending} onClick={toggleVisibleMembers}>
          {allVisibleSelected ? 'Deselect all' : 'Select all'}
        </Button>
        <Button disabled={!selectedBooks.size || selectedSequences.size !== selectedBooks.size || !selectedMembers.size || sending}
          onClick={() => void sendToCoordinator()}>{sending ? 'Preparing…' : `Parcel ${selectedBooks.size} books for ${selectedMembers.size} people`}</Button>
      </div>
      <div className="course-table-wrap course-table-wrap--candidates course-manual-dispatch-table course-manual-dispatch-table--members" onContextMenu={openResendMenu}>
        <ManualBookMemberSelectionContext.Provider value={{ selected: selectedMembers, disabled: sending, toggle: toggleMember }}>
        <DataTable key={`${coordinator.coordinator_key}:${search}`}
          data={visibleMembers}
          className="display course-table" options={{
            pageLength: 500, rowId: 'enrollment_key', lengthChange: false, searching: false, autoWidth: false,
            scrollY: 'var(--dispatch-table-height, 320px)', scrollCollapse: false,
            order: [[1, 'asc']],
            columnDefs: [
              { targets: 0, orderable: false, width: '5%' },
              { targets: 1, width: '8%' },
              { targets: 2, width: '19%' },
              { targets: 3, width: '9%' },
              { targets: 4, width: '14%' },
              { targets: 5, width: '6%' },
              { targets: 6, width: '5%' },
              { targets: 7, width: '5%' },
              { targets: 8, orderable: false, width: '11%' },
              { targets: 9, orderable: false, width: '18%' }
            ],
            layout: { topStart: null, topEnd: null, bottomStart: 'info', bottomEnd: 'paging' }
          }}>
          <Column title="Select" data="enrollment_key">{(_value, _type, row: CoordinatorWalletMember) =>
            <ManualBookMemberCheckbox memberKey={row.enrollment_key} bbsNumber={row.bbs_number} />}</Column>
          <Column title="BBS no." data="bbs_number">{(value, type) =>
            type === 'sort' || type === 'type' ? Number(String(value).replace(/\D/g, '')) : String(value)}</Column>
          <Column title="Name" data="name" />
          <Column title="Balance" data="wallet_balance">{(_value, type, row: CoordinatorWalletMember) => {
            const amount = Number(row.wallet_balance) - Number(row.credit_balance)
            if (type === 'sort' || type === 'type') return amount
            return <span data-dispatch-balance className={amount < 0 ? 'course-balance--negative' : 'course-balance--positive'}>{signedAmount(amount)}</span>
          }}</Column>
          <Column title="District" data="district" />
          <Column title="Exams" data="exams_attended" />
          <Column title="Sent" data="books_sent" />
          <Column title="Paid" data="books_paid">{(value) => <span data-dispatch-paid>{String(value)}</span>}</Column>
          <Column title="Cash payment" data="enrollment_key">{(_value, _type, row: CoordinatorWalletMember) =>
            <ManualBookPaymentInput enrollmentKey={row.enrollment_key} bbsNumber={row.bbs_number} />}</Column>
          <Column title="Options" data="enrollment_key">{(_value, _type, row: CoordinatorWalletMember) =>
            <span className="course-manual-dispatch-actions">
              <Button variant="outline" onClick={() => onCandidate(row.enrollment_key)}>View candidate</Button>
            </span>}</Column>
        </DataTable>
        </ManualBookMemberSelectionContext.Provider>
      </div>
    </> : <>
      <div className={`course-table-wrap course-table-wrap--candidates course-manual-dispatch-table course-manual-dispatch-table--${recipientType === 'individual' ? 'individual' : 'coordinators'}`} onContextMenu={openResendMenu}>
        <ManualBookSendContext.Provider value={{ selectedCount: selectedBooks.size, selectedSequences, sendingCandidate, sentCandidates,
          onSend: (candidate) => { void sendToCandidate(candidate) } }}>
        <DataTable ref={recipientTable} key={`${recipientType}:${country}:${search}`} className="display course-table" options={{
          serverSide: true, processing: true, pageLength: 500, displayStart: getManualDispatchHistory(country).starts[recipientType],
          rowId: recipientType === 'individual' ? 'enrollment_key' : 'coordinator_key', lengthChange: false,
          searching: false, autoWidth: false, order: [[0, 'asc']],
          scrollY: 'var(--dispatch-table-height, 400px)', scrollCollapse: false,
          columnDefs: recipientType === 'individual' ? [
            { targets: 0, width: '7%' },
            { targets: 1, width: '16%' },
            { targets: 2, width: '8%' },
            { targets: [3, 4, 5], width: '5%' },
            { targets: 6, width: '12%' },
            { targets: 7, width: '10%' },
            { targets: 8, width: '10%' },
            { targets: 9, width: '22%' },
            { targets: [2, 3, 4, 5, 8, 9], orderable: false, defaultContent: '—' }
          ] : [
            { targets: 0, width: '7%' },
            { targets: 1, width: '22%' },
            { targets: 2, width: '8%' },
            { targets: 3, width: '16%' },
            { targets: 4, width: '15%' },
            { targets: 5, orderable: false, width: '32%' }
          ],
          layout: { topStart: null, topEnd: null, bottomStart: 'info', bottomEnd: 'paging' },
          drawCallback: function () {
            if (recipientType !== 'coordinator') return
            const body = this.api().table().container().querySelector<HTMLElement>('.dt-scroll-body')
            if (body) body.scrollTop = getManualDispatchHistory(country).coordinatorScrollTop
          },
          ajax: (request, callback) => {
            const page = Math.floor((request.start ?? 0) / (request.length || 500)) + 1
            const column = request.order?.[0]?.column ?? 0
            const direction = request.order?.[0]?.dir === 'desc' ? '-' : ''
            const fields = recipientType === 'individual'
              ? ['bbs_number', 'full_name', '', '', '', '', 'district', 'state']
              : ['number', 'name', 'active_member_count', 'district', 'state']
            const ordering = `${direction}${fields[column] || fields[0]}`
            const result = recipientType === 'individual'
              ? getCandidates(country, page, 'OFFLINE', 'ACTIVE', search, { individualOnly: true, includeProgress: true, ordering, pageSize: 500 })
              : getCoordinatorPage(country, page, { search, status: 'ACTIVE', ordering, pageSize: 500 })
            void result.then((response) => {
              getManualDispatchHistory(country).starts[recipientType] = request.start ?? 0
              if (recipientType === 'individual') recipientRows.current = response.results as Candidate[]
              callback({ draw: request.draw, recordsTotal: response.count, recordsFiltered: response.count, data: response.results })
            })
              .catch((error) => {
                notify.error(error instanceof Error ? error.message : 'Could not load recipients')
                callback({ draw: request.draw, recordsTotal: 0, recordsFiltered: 0, data: [] })
              })
          }
        }}>
          {recipientType === 'individual' ? [
            <Column key="bbs" title="BBS no." data="bbs_identifier">{(_value, _type, row: Candidate) =>
              <button className="course-link" onClick={() => onCandidate(row.enrollment_key)}>{row.bbs_identifier}</button>}</Column>
            , <Column key="name" title="Name" data="full_name" />
            , <Column key="balance" title="Balance" data="signed_balance">{(value) => {
              const amount = Number(value ?? 0)
              return <span data-dispatch-balance className={amount < 0 ? 'course-balance--negative' : 'course-balance--positive'}>{signedAmount(amount)}</span>
            }}</Column>
            , <Column key="exams" title="Exams" data="exams_attended" />
            , <Column key="sent" title="Sent" data="books_sent" />
            , <Column key="paid" title="Paid" data="books_paid">{(value) => <span data-dispatch-paid>{String(value)}</span>}</Column>
            , <Column key="district" title="District" data="district" />
            , <Column key="state" title="State" data="state" />
            , <Column key="cash-payment" title="Cash payment" data="enrollment_key">{(_value, _type, row: Candidate) =>
              <ManualBookPaymentInput enrollmentKey={row.enrollment_key} bbsNumber={row.bbs_identifier} />}</Column>
            , <Column key="options" title="Options" data="enrollment_key">{(_value, _type, row: Candidate) =>
              <span className="course-manual-dispatch-actions">
                <Button variant="outline" onClick={() => onCandidate(row.enrollment_key)}>View candidate</Button>
                <ManualBookSendButton candidate={row} />
              </span>}</Column>
          ] : [
            <Column key="number" title="C no." data="number">{(_value, _type, row: Coordinator) =>
              <button className="course-link" onClick={() => onCoordinator(row.coordinator_key)}>C-{row.number}</button>}</Column>
            , <Column key="name" title="Coordinator" data="name" />
            , <Column key="people" title="People" data="active_member_count" />
            , <Column key="district" title="District" data="district" />
            , <Column key="state" title="State" data="state" />
            , <Column key="options" title="Options" data="coordinator_key">{(_value, _type, row: Coordinator) =>
              <span className="course-manual-dispatch-actions">
                <Button variant="outline" onClick={() => onCoordinator(row.coordinator_key)}>View coordinator</Button>
                <Button onClick={() => selectCoordinatorPeople(row)}>Select people</Button>
              </span>}</Column>
          ]}
        </DataTable>
        </ManualBookSendContext.Provider>
      </div>
    </>}
    {loading && <p role="status">Loading…</p>}
    {choosingBooks && <CoordinatorBookPicker books={books} selected={selectedBooks}
      onChange={(next) => {
        getManualDispatchHistory(country).selectedBooks = [...next]
        setSelectedBooks(next)
        setSentCandidates(new Set())
      }}
      onClose={() => setChoosingBooks(false)} />}
    {resendMenu && <div className="course-context-menu course-context-menu--actions"
      style={{ left: resendMenu.x, top: resendMenu.y }} onClick={(event) => event.stopPropagation()}>
      <button disabled={!selectedBooks.size || selectedSequences.size !== selectedBooks.size || !!sendingCandidate}
        onClick={() => {
          const { key, bbs } = resendMenu
          setResendMenu(null)
          void resendSelectedBooks(key, bbs)
        }}>Resend selected books (charge again)</button>
    </div>}
  </section>
}
