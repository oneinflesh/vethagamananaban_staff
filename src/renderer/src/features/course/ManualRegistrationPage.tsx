import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNotifications } from '../notifications/Notifications'
import FullScreenLoader from '../shell/FullScreenLoader'
import { useSmoothLoading } from '../shell/useSmoothLoading'
import {
  createManualRegistration,
  getCoordinators,
  getRegistrationOptions,
  type Candidate,
  type Coordinator,
  type RegistrationOptions
} from './courseApi'

type Form = {
  full_name: string
  date_of_birth: string
  gender: string
  language: string
  email: string
  phone: string
  phone2: string
  coordinator_key: string
  address_line1: string
  address_line2: string
  address_line3: string
  district: string
  state: string
  postal_code: string
  payment_method: string
  exam_keys: string[]
}
const initial: Form = {
  full_name: '',
  date_of_birth: '',
  gender: '',
  language: '',
  email: '',
  phone: '',
  phone2: '',
  coordinator_key: '',
  address_line1: '',
  address_line2: '',
  address_line3: '',
  district: '',
  state: '',
  postal_code: '',
  payment_method: 'CASH',
  exam_keys: []
}
const fields: { key: keyof Form; label: string; required?: boolean; type?: string }[] = [
  { key: 'full_name', label: 'Name', required: true },
  { key: 'date_of_birth', label: 'Date of birth', type: 'date', required: true },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone 1', required: true },
  { key: 'phone2', label: 'Phone 2' },
  { key: 'address_line1', label: 'Address 1', required: true },
  { key: 'address_line2', label: 'Address 2' },
  { key: 'address_line3', label: 'Address 3' },
  { key: 'district', label: 'District' },
  { key: 'state', label: 'State' },
  { key: 'postal_code', label: 'Pincode' }
]

export default function ManualRegistrationPage({
  country,
  onBack,
  onCandidate
}: {
  country: string
  onBack: () => void
  onCandidate: (key: string) => void
}): React.JSX.Element {
  const [options, setOptions] = useState<RegistrationOptions | null>(null)
  const [coordinators, setCoordinators] = useState<Coordinator[]>([])
  const [form, setForm] = useState<Form>(initial)
  const [created, setCreated] = useState<Candidate | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const notify = useNotifications()
  const { loading, leaving, finish } = useSmoothLoading()

  useEffect(() => {
    let active = true
    Promise.all([getRegistrationOptions(), getCoordinators(country)])
      .then(([result, coordinatorPage]) => {
        if (active) {
          setOptions(result)
          setCoordinators(coordinatorPage.results)
          setForm((current) => ({
            ...current,
            language:
              result.languages.find((item) => item.is_active && item.offline_enabled)?.code ?? ''
          }))
        }
      })
      .catch((cause) => {
        if (active)
          setError(cause instanceof Error ? cause.message : 'Could not load registration options')
      })
      .finally(() => {
        if (active) finish()
      })
    return () => {
      active = false
    }
  }, [country, finish])

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (!options) return
    if (!form.exam_keys.length) {
      setError('Select released books to fund.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await createManualRegistration(options.course.course_key, {
        ...form,
        mode: 'OFFLINE',
        country,
        account_phone: form.phone,
        payment_note: 'Manual registration',
        exam_keys: form.exam_keys,
        address: [
          form.address_line1,
          form.address_line2,
          form.address_line3,
          form.district,
          form.state,
          form.postal_code
        ]
          .filter(Boolean)
          .join(', ')
      })
      setCreated(result)
      notify.success('Offline candidate registered')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not register candidate')
    } finally {
      setSaving(false)
    }
  }

  const deliveryState =
    coordinators.find((item) => item.coordinator_key === form.coordinator_key)?.state || form.state
  const priceState = deliveryState.replace(/\s/g, '').toLowerCase() === 'tamilnadu'
  const total = options
    ? Number(options.course.offline_registration_fee) +
      options.exams
        .filter((exam) => form.exam_keys.includes(exam.exam_key))
        .reduce((sum, exam) => {
          const edition = exam.editions[form.language]
          return sum + Number(priceState ? edition?.course_price_tn : edition?.course_price_other)
        }, 0)
    : 0
  return (
    <section className="page course-page">
      <div className="course-toolbar">
        <Button variant="outline" onClick={onBack}>
          ← Course
        </Button>
        <h1>New manual offline registration</h1>
        <span>{country}</span>
      </div>
      {error && <div className="course-error">{error}</div>}
      {created ? (
        <div className="candidate-form">
          <h2>Registration complete</h2>
          <p>
            {created.full_name} · {created.bbs_identifier}
          </p>
          <p>Initial password: Bible@{Number(created.bbs_identifier.replace(/\D/g, ''))}</p>
          <p>Ask the candidate to change this password after login.</p>
          <Button onClick={() => onCandidate(created.enrollment_key)}>View candidate</Button>{' '}
          <Button
            variant="outline"
            onClick={() => {
              setCreated(null)
              setForm({
                ...initial,
                language:
                  options?.languages.find((item) => item.is_active && item.offline_enabled)?.code ??
                  ''
              })
            }}
          >
            Register another
          </Button>
        </div>
      ) : (
        options && (
          <form className="manual-registration-layout" onSubmit={(event) => void submit(event)}>
            <div className="candidate-form">
              <div className="candidate-form__grid">
                {fields.map(({ key, label, required, type }) => (
                  <label key={key}>
                    {label}
                    <Input
                      type={type ?? 'text'}
                      required={required && (key !== 'address_line1' || !form.coordinator_key)}
                      value={form[key]}
                      onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                    />
                  </label>
                ))}
                <label>
                  Coordinator
                  <select
                    value={form.coordinator_key}
                    onChange={(event) => setForm({ ...form, coordinator_key: event.target.value })}
                  >
                    <option value="">Individual candidate</option>
                    {coordinators.map((coordinator) => (
                      <option key={coordinator.coordinator_key} value={coordinator.coordinator_key}>
                        {coordinator.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Gender
                  <select
                    required
                    value={form.gender}
                    onChange={(event) => setForm({ ...form, gender: event.target.value })}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label>
                  Language
                  <select
                    required
                    value={form.language}
                    onChange={(event) => setForm({ ...form, language: event.target.value })}
                  >
                    {options.languages
                      .filter((item) => item.is_active && item.offline_enabled)
                      .map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Payment method
                  <select
                    value={form.payment_method}
                    onChange={(event) => setForm({ ...form, payment_method: event.target.value })}
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>
              </div>
            </div>
            <aside className="candidate-form">
              <h2>Fund books in rupees</h2>
              <div className="course-choice-list">
                {options.exams
                  .filter((exam) => exam.is_active && exam.is_released)
                  .map((exam) => (
                    <label key={exam.exam_key} className="course-choice">
                      <input
                        type="checkbox"
                        checked={form.exam_keys.includes(exam.exam_key)}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            exam_keys: event.target.checked
                              ? [...current.exam_keys, exam.exam_key]
                              : current.exam_keys.filter((key) => key !== exam.exam_key)
                          }))
                        }
                      />
                      {exam.sequence}. {exam.editions[form.language]?.name || exam.title} · ₹
                      {priceState
                        ? exam.editions[form.language]?.course_price_tn
                        : exam.editions[form.language]?.course_price_other}
                    </label>
                  ))}
              </div>
              <p>
                Registration ₹{options.course.offline_registration_fee} + {form.exam_keys.length}{' '}
                book(s) = ₹{total}
              </p>
              <Button type="submit" disabled={saving}>
                {saving ? 'Registering…' : 'Register and record payment'}
              </Button>
            </aside>
          </form>
        )
      )}
      {loading && <FullScreenLoader message="Loading registration" leaving={leaving} />}
    </section>
  )
}
