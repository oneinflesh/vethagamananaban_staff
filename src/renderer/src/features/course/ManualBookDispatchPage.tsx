import { useEffect, useState } from 'react'
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
import ManualBookSelectionPage from './ManualBookSelectionPage'
import CandidateActionPanel from './CandidateActionPanel'
import useDispatchTableHeight from './useDispatchTableHeight'
import CoordinatorBookPicker from './CoordinatorBookPicker'

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
  const [recipientType, setRecipientType] = useState<'individual' | 'coordinator'>('individual')
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState<CoordinatorWalletMember[]>([])
  const [coordinator, setCoordinator] = useState<Coordinator | null>(null)
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [paymentCandidate, setPaymentCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(false)
  const [books, setBooks] = useState<ExamInfo[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set())
  const [choosingBooks, setChoosingBooks] = useState(false)
  const [allowCredit, setAllowCredit] = useState(false)
  const [sending, setSending] = useState(false)
  const [memberRefresh, setMemberRefresh] = useState(0)
  const notify = useNotifications()
  const pageRef = useDispatchTableHeight(`${recipientType}:${coordinator?.coordinator_key ?? ''}`)

  function selectCoordinatorPeople(row: Coordinator): void {
    setLoading(true)
    setSearch('')
    setSelectedMembers(new Set())
    setSelectedBooks(new Set())
    setAllowCredit(false)
    setCoordinator(row)
  }

  function changeRecipientType(type: 'individual' | 'coordinator'): void {
    setRecipientType(type)
    setSearch('')
    setCoordinator(null)
    setCandidate(null)
    setSelectedMembers(new Set())
    setSelectedBooks(new Set())
    setAllowCredit(false)
  }

  useEffect(() => {
    if (!coordinator) return
    let active = true
    getCoordinatorWalletMembers(coordinator.coordinator_key).then((result) => {
      if (active) {
        const activeMembers = result.filter((member) => member.status === 'ACTIVE' && member.mode === 'OFFLINE')
        setMembers(activeMembers)
        getRegistrationOptions().then((options) => {
          if (active) setBooks(options.exams.filter((book) => book.is_active))
        }).catch((error) => {
          if (active) notify.error(error instanceof Error ? error.message : 'Could not load books')
        })
      }
    }).catch((error) => {
      if (active) notify.error(error instanceof Error ? error.message : 'Could not load people')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [coordinator, memberRefresh, notify])

  async function sendToCoordinator(): Promise<void> {
    if (!coordinator || !selectedBooks.size || !selectedMembers.size || sending) return
    setSending(true)
    try {
      const keys = [...selectedMembers]
      const examKeys = [...selectedBooks]
      const options = await Promise.all(keys.map((key) => getOtherBookOptions(key)))
      const stockByBook = new Map<number, { required: number; stock: number }>()
      const ineligible = keys.filter((_, index) => {
        const chosen = examKeys.map((examKey) => options[index].manual_books.find((item) => item.exam_key === examKey))
        const invalid = chosen.some((book) => !book || !book.active || book.price === null || book.stock < 1)
        for (const book of chosen) {
          if (book?.book_id == null) continue
          const current = stockByBook.get(book.book_id) ?? { required: 0, stock: book.stock }
          current.required += 1
          current.stock = Math.min(current.stock, book.stock)
          stockByBook.set(book.book_id, current)
        }
        const total = chosen.reduce((sum, book) => sum + Number(book?.price ?? 0), 0)
        return invalid || !options[index].manual_address
          || (!allowCredit && Number(options[index].wallet_balance) < total)
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
      const parcelBatch = crypto.randomUUID()
      for (const key of keys) {
        try {
          await candidateAction('manual-book-dispatch', key, {
            exam_keys: examKeys, tracking_number: '', allow_credit: allowCredit, parcel_batch: parcelBatch
          })
          sent += 1
        } catch (error) {
          notify.error(`${sent} sent; ${keys.length - sent} not sent. ${error instanceof Error ? error.message : 'Dispatch failed'}`)
          setSelectedMembers(new Set(keys.slice(sent)))
          if (sent) setMemberRefresh((value) => value + 1)
          return
        }
      }
      notify.success(`${examKeys.length} books parcelled for ${sent} people under C-${coordinator.number}`)
      setSelectedMembers(new Set())
      setSelectedBooks(new Set())
      setMemberRefresh((value) => value + 1)
    } finally {
      setSending(false)
    }
  }

  if (candidate) return (
    <ManualBookSelectionPage
      candidate={candidate}
      onBack={() => {
        setCandidate(null)
        setCoordinator(null)
      }}
    />
  )

  return <section ref={pageRef} className="page course-page course-manual-dispatch-page">
    <div className="course-toolbar course-toolbar--manual-dispatch">
      <Button variant="outline" onClick={coordinator ? () => { setCoordinator(null); setSelectedMembers(new Set()) } : onBack}>← Course</Button>
      <h1>Send released books</h1>
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
        onChange={(event) => setSearch(event.target.value)} />
    </div>
    {coordinator ? <>
      <h2>{coordinator.name} · C-{coordinator.number}</h2>
      <p className="course-manual-dispatch-address">
        Parcel address: {coordinator.address_line1 || 'No address'}, {coordinator.district}, {coordinator.state} {coordinator.postal_code}
      </p>
      <div className="course-manual-dispatch-controls">
        <Button variant="outline" onClick={() => setChoosingBooks(true)}>Choose books ({selectedBooks.size})</Button>
        <label className="course-manual-book-credit"><input type="checkbox" checked={allowCredit}
          onChange={(event) => setAllowCredit(event.target.checked)} /> Use credit</label>
        <Button disabled={!selectedBooks.size || !selectedMembers.size || sending}
          onClick={() => void sendToCoordinator()}>{sending ? 'Preparing…' : `Parcel ${selectedBooks.size} books for ${selectedMembers.size} people`}</Button>
      </div>
      <div className="course-table-wrap course-table-wrap--candidates course-manual-dispatch-table course-manual-dispatch-table--members">
        <DataTable key={`${coordinator.coordinator_key}:${search}:${[...selectedMembers].sort().join(',')}`}
          data={members.filter((member) => `${member.bbs_number} ${member.name}`.toLowerCase().includes(search.toLowerCase()))}
          className="display course-table" options={{
            pageLength: 20, lengthChange: false, searching: false, autoWidth: true,
            scrollX: true, scrollY: 'var(--dispatch-table-height, 320px)', scrollCollapse: false,
            order: [[1, 'asc']],
            columnDefs: [
              { targets: 0, orderable: false },
              { targets: 7, orderable: false }
            ],
            layout: { topStart: null, topEnd: null, bottomStart: 'info', bottomEnd: 'paging' }
          }}>
          <Column title="Select" data="enrollment_key">{(_value, _type, row: CoordinatorWalletMember) =>
            <input type="checkbox" aria-label={`Select ${row.bbs_number}`}
              checked={selectedMembers.has(row.enrollment_key)} disabled={sending}
              onChange={() => setSelectedMembers((current) => {
                const next = new Set(current)
                if (next.has(row.enrollment_key)) next.delete(row.enrollment_key)
                else next.add(row.enrollment_key)
                return next
              })} />}</Column>
          <Column title="BBS no." data="bbs_number">{(value, type) =>
            type === 'sort' || type === 'type' ? Number(String(value).replace(/\D/g, '')) : String(value)}</Column>
          <Column title="Name" data="name" />
          <Column title="District" data="district" />
          <Column title="Exams" data="exams_attended" />
          <Column title="Sent" data="books_sent" />
          <Column title="Paid" data="books_paid" />
          <Column title="Options" data="enrollment_key">{(_value, _type, row: CoordinatorWalletMember) =>
            <span className="course-manual-dispatch-actions">
              <Button variant="outline" onClick={() => onCandidate(row.enrollment_key)}>View candidate</Button>
              <Button variant="outline" onClick={() => setPaymentCandidate({ enrollment_key: row.enrollment_key,
                bbs_identifier: row.bbs_number, full_name: row.name, mode: row.mode } as Candidate)}>Record payment</Button>
            </span>}</Column>
        </DataTable>
      </div>
    </> : <>
      <div className={`course-table-wrap course-table-wrap--candidates course-manual-dispatch-table course-manual-dispatch-table--${recipientType === 'individual' ? 'individual' : 'coordinators'}`}>
        <DataTable key={`${recipientType}:${country}:${search}:${memberRefresh}`} className="display course-table" options={{
          serverSide: true, processing: true, pageLength: 20, lengthChange: false,
          searching: false, autoWidth: true, order: [[0, 'asc']],
          scrollX: true, scrollY: 'var(--dispatch-table-height, 400px)', scrollCollapse: false,
          columnDefs: recipientType === 'individual' ? [
            { targets: [2, 3, 4], orderable: false, defaultContent: '—' }
          ] : [
            { targets: 0, width: '8%' },
            { targets: 1, width: '19%' },
            { targets: 2, width: '8%' },
            { targets: 3, width: '15%' },
            { targets: 4, width: '15%' },
            { targets: 5, orderable: false, width: '35%' }
          ],
          layout: { topStart: null, topEnd: null, bottomStart: 'info', bottomEnd: 'paging' },
          ajax: (request, callback) => {
            const page = Math.floor((request.start ?? 0) / (request.length || 20)) + 1
            const column = request.order?.[0]?.column ?? 0
            const direction = request.order?.[0]?.dir === 'desc' ? '-' : ''
            const fields = recipientType === 'individual'
              ? ['bbs_number', 'full_name', '', '', '', 'district', 'state']
              : ['number', 'name', 'active_member_count', 'district', 'state']
            const ordering = `${direction}${fields[column] || fields[0]}`
            const result = recipientType === 'individual'
              ? getCandidates(country, page, 'OFFLINE', 'ACTIVE', search, { individualOnly: true, includeProgress: true, ordering })
              : getCoordinatorPage(country, page, { search, status: 'ACTIVE', ordering })
            void result.then((response) => callback({ draw: request.draw,
              recordsTotal: response.count, recordsFiltered: response.count, data: response.results }))
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
            , <Column key="exams" title="Exams" data="exams_attended" />
            , <Column key="sent" title="Sent" data="books_sent" />
            , <Column key="paid" title="Paid" data="books_paid" />
            , <Column key="district" title="District" data="district" />
            , <Column key="state" title="State" data="state" />
            , <Column key="options" title="Options" data="enrollment_key">{(_value, _type, row: Candidate) =>
              <span className="course-manual-dispatch-actions">
                <Button variant="outline" onClick={() => onCandidate(row.enrollment_key)}>View candidate</Button>
                <Button variant="outline" onClick={() => setPaymentCandidate(row)}>Record payment</Button>
                <Button onClick={() => setCandidate(row)}>Send books</Button>
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
      </div>
    </>}
    {loading && <p role="status">Loading…</p>}
    {choosingBooks && <CoordinatorBookPicker books={books} selected={selectedBooks}
      onChange={setSelectedBooks} onClose={() => setChoosingBooks(false)} />}
    {paymentCandidate && <CandidateActionPanel action="payment" candidate={paymentCandidate}
      onClose={() => setPaymentCandidate(null)}
      onChanged={() => { setPaymentCandidate(null); setMemberRefresh((value) => value + 1) }} />}
  </section>
}
