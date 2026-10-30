import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FullScreenLoader from '../shell/FullScreenLoader'
import { useNotifications } from '../notifications/Notifications'
import { useSmoothLoading } from '../shell/useSmoothLoading'
import PaymentsTable from './PaymentsTable'
import PaymentHistoryDialog from './PaymentHistoryDialog'
import CandidateActionPanel from './CandidateActionPanel'
import ExamResultsTable from './ExamResultsTable'
import CandidateCoordinatorAssignment from './CandidateCoordinatorAssignment'
import { formatPaymentBalance, paymentBalanceTone } from './paymentBalance'
import {
  getCandidate,
  updateCandidate,
  uploadPhoto,
  type Candidate,
  type CandidateSummary
} from './courseApi'

type Tab = 'details' | 'payments' | 'exams'
const editable: { key: keyof Candidate; label: string; type?: string }[] = [
  { key: 'full_name', label: 'Name' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone 1' },
  { key: 'phone2', label: 'Phone 2' },
  { key: 'date_of_birth', label: 'Date of birth', type: 'date' },
  { key: 'gender', label: 'Gender' },
  { key: 'education', label: 'Education' },
  { key: 'church_background', label: 'Church background' },
  { key: 'church_background_other', label: 'Church details' },
  { key: 'address_line1', label: 'Address 1' },
  { key: 'address_line2', label: 'Address 2' },
  { key: 'address_line3', label: 'Address 3' },
  { key: 'district', label: 'District' },
  { key: 'state', label: 'State' },
  { key: 'postal_code', label: 'Pincode' }
]

export default function CandidateDetails({
  candidateKey,
  initialTab = 'details',
  onBack,
  onCoordinator
}: {
  candidateKey: string
  initialTab?: Tab
  onBack: () => void
  onCoordinator: (key: string) => void
}): React.JSX.Element {
  const [summary, setSummary] = useState<CandidateSummary | null>(null)
  const [form, setForm] = useState<Candidate | null>(null)
  const [tab, setTab] = useState<Tab>(initialTab)
  const [saving, setSaving] = useState(false)
  const [addingPayment, setAddingPayment] = useState(false)
  const [showTransactions, setShowTransactions] = useState(false)
  const notify = useNotifications()
  const { loading, leaving, finish } = useSmoothLoading()

  useEffect(() => {
    let active = true
    getCandidate(candidateKey)
      .then((value) => {
        if (active) {
          setSummary(value)
          setForm(value.candidate)
        }
      })
      .catch((error) => {
        if (active)
          notify.error(error instanceof Error ? error.message : 'Could not load candidate')
      })
      .finally(() => {
        if (active) finish()
      })
    return () => {
      active = false
    }
  }, [candidateKey, finish, notify])

  async function save(): Promise<void> {
    if (!form) return
    setSaving(true)
    try {
      const details = Object.fromEntries(editable.map(({ key }) => [key, form[key]]))
      const saved = await updateCandidate(candidateKey, {
        ...details,
        date_of_birth: form.date_of_birth || null,
        address: [form.address_line1, form.address_line2, form.address_line3]
          .filter(Boolean)
          .join(', '),
        status: form.status
      })
      setForm(saved)
      setSummary((current) => (current ? { ...current, candidate: saved } : current))
      notify.success('Candidate saved')
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not save candidate')
    } finally {
      setSaving(false)
    }
  }

  async function changePhoto(file: File): Promise<void> {
    setSaving(true)
    try {
      const saved = await uploadPhoto(candidateKey, file)
      setForm(saved)
      setSummary((current) => (current ? { ...current, candidate: saved } : current))
      notify.success('Photo updated')
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not upload photo')
    } finally {
      setSaving(false)
    }
  }
  async function reloadCandidate(): Promise<void> {
    const updated = await getCandidate(candidateKey)
    setSummary(updated)
    setForm(updated.candidate)
  }

  return (
    <section className="page course-page">
      <div className="course-toolbar">
        <Button variant="outline" onClick={onBack}>
          ← Candidates
        </Button>
        <h1>{form?.full_name || 'Candidate details'}</h1>
        <span>{form?.bbs_identifier}</span>
        {form?.mode === 'OFFLINE' && <span className={paymentBalanceTone(form.wallet_balance, form.credit_balance)}>Balance {formatPaymentBalance(form.wallet_balance, form.credit_balance)}</span>}
      </div>
      <div className="course-tabs">
        {(['details', 'payments', 'exams'] as const).map((item) => (
          <Button
            key={item}
            variant={tab === item ? 'secondary' : 'ghost'}
            onClick={() => setTab(item)}
          >
            {item === 'exams' ? 'Exams & marks' : item[0].toUpperCase() + item.slice(1)}
          </Button>
        ))}
      </div>
      {tab === 'details' && form && (
        <div className="candidate-detail-layout">
          <div className="candidate-form">
            <div className="candidate-form__readonly">
              <span>BBS number: {form.bbs_identifier}</span>
              <span>Mode: {form.mode}</span>
              <span>Language: {form.language}</span>
              <span>Country: {form.country}</span>
              <span>Status: {form.status}</span>
            </div>
            <div className="candidate-form__grid">
              <label>
                Status
                <select
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value })}
                >
                  <option value="PAYMENT_PENDING">Payment pending</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Discontinued</option>
                  <option value="DROPOUT">Dropout</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </label>
              {editable.map(({ key, label, type }) => (
                <label key={key}>
                  {label}
                  <Input
                    type={type || 'text'}
                    value={String(form[key] ?? '')}
                    onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                  />
                </label>
              ))}
            </div>
            {summary && (
              <CandidateCoordinatorAssignment
                key={`${candidateKey}:${summary.coordinator?.coordinator_key ?? 'individual'}`}
                candidateKey={candidateKey}
                summary={summary}
                onUpdated={reloadCandidate}
                onCoordinator={onCoordinator}
              />
            )}
            <div>
              <Button disabled={saving} onClick={() => void save()}>
                Save candidate details
              </Button>
            </div>
          </div>
          <aside className="candidate-photo">
            {form.photo_url ? (
              <img src={form.photo_url} alt={`${form.full_name} profile`} />
            ) : (
              <div className="candidate-photo__empty">No profile photo</div>
            )}
            <label className="candidate-photo__upload">
              Change photo
              <input
                type="file"
                accept="image/*"
                disabled={saving}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void changePhoto(file)
                }}
              />
            </label>
          </aside>
        </div>
      )}
      {tab === 'payments' && summary && (
        <PaymentsTable summary={summary} onAddPayment={() => setAddingPayment(true)}
          onTransactions={() => setShowTransactions(true)}
          onRestored={() => void reloadCandidate().catch((error) => notify.error(error instanceof Error ? error.message : 'Could not refresh candidate'))} />
      )}
      {tab === 'exams' && summary && (
        <ExamResultsTable
          results={summary.results}
          allocations={summary.candidate.book_allocations ?? []}
          onUpdated={reloadCandidate}
        />
      )}
      {loading && <FullScreenLoader message="Loading candidate" leaving={leaving} />}
      {showTransactions && (
        <PaymentHistoryDialog candidateKey={candidateKey} onClose={() => setShowTransactions(false)}
          onRestored={() => void reloadCandidate().catch((error) => notify.error(error instanceof Error ? error.message : 'Could not refresh candidate'))} />
      )}
      {addingPayment && form && (
        <CandidateActionPanel
          action="payment"
          candidate={form}
          onClose={() => setAddingPayment(false)}
          onChanged={() => {
            setAddingPayment(false)
            void reloadCandidate().catch((error) =>
              notify.error(error instanceof Error ? error.message : 'Could not refresh payments')
            )
          }}
        />
      )}
    </section>
  )
}
