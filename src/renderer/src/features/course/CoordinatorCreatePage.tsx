import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FullScreenLoader from '../shell/FullScreenLoader'
import { useNotifications } from '../notifications/Notifications'
import {
  createCoordinator,
  getCandidates,
  getRegistrationOptions,
  uploadCoordinatorPhoto,
  type Candidate
} from './courseApi'

type Form = {
  name: string
  phone: string
  email: string
  address_line1: string
  address_line2: string
  address_line3: string
  district: string
  state: string
  postal_code: string
}

const emptyForm: Form = {
  name: '',
  phone: '',
  email: '',
  address_line1: '',
  address_line2: '',
  address_line3: '',
  district: '',
  state: '',
  postal_code: ''
}

const fields: { key: keyof Form; label: string; required?: boolean }[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'phone', label: 'Phone', required: true },
  { key: 'email', label: 'Email' },
  { key: 'address_line1', label: 'Address 1', required: true },
  { key: 'address_line2', label: 'Address 2' },
  { key: 'address_line3', label: 'Address 3' },
  { key: 'district', label: 'District' },
  { key: 'state', label: 'State' },
  { key: 'postal_code', label: 'Pincode' }
]

export default function CoordinatorCreatePage({
  country,
  onBack,
  onCreated
}: {
  country: string
  onBack: () => void
  onCreated: (key: string) => void
}): React.JSX.Element {
  const [courseKey, setCourseKey] = useState('')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [kind, setKind] = useState<'candidate' | 'standalone'>('candidate')
  const [candidateKey, setCandidateKey] = useState('')
  const [candidateSearch, setCandidateSearch] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [form, setForm] = useState<Form>(emptyForm)
  const [photo, setPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const notify = useNotifications()

  useEffect(() => {
    let active = true
    getRegistrationOptions()
      .then((options) => {
        if (!active) return
        setCourseKey(options.course.course_key)
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load candidates')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [country])

  useEffect(() => {
    if (kind !== 'candidate' || !candidateSearch.trim()) {
      return
    }
    let active = true
    const timer = window.setTimeout(() => {
      getCandidates(country, 1, 'OFFLINE', 'ACTIVE', candidateSearch.trim())
        .then((page) => {
          if (active) setCandidates(page.results)
        })
        .catch((cause) => {
          if (active)
            setError(cause instanceof Error ? cause.message : 'Could not search candidates')
        })
    }, 300)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [country, kind, candidateSearch])

  const matchingCandidates = candidateSearch.trim() ? candidates : []
  const visibleCandidates =
    selectedCandidate &&
    !matchingCandidates.some((item) => item.enrollment_key === selectedCandidate.enrollment_key)
      ? [selectedCandidate, ...matchingCandidates]
      : matchingCandidates

  async function save(): Promise<void> {
    if (!courseKey || saving) return
    if (kind === 'candidate' && !candidateKey) {
      setError('Select the candidate who will also be a coordinator.')
      return
    }
    if (kind === 'candidate' && !(selectedCandidate?.address_line1 || selectedCandidate?.address)) {
      setError('Enter this candidate’s address before making them a coordinator.')
      return
    }
    if (
      kind === 'standalone' &&
      (!form.name.trim() || !form.phone.trim() || !form.address_line1.trim())
    ) {
      setError('Name, phone, and Address 1 are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const created = await createCoordinator({
        course_key: courseKey,
        country,
        ...(kind === 'candidate' ? { enrollment_key: candidateKey } : form)
      })
      if (photo) {
        try {
          await uploadCoordinatorPhoto(created.coordinator_key, photo)
        } catch (cause) {
          notify.error(
            cause instanceof Error ? cause.message : 'Coordinator created, but photo upload failed'
          )
        }
      }
      notify.success('Coordinator created')
      onCreated(created.coordinator_key)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create coordinator')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page course-page">
      <div className="course-toolbar">
        <Button variant="outline" onClick={onBack}>
          ← Coordinators
        </Button>
        <h1>Create coordinator</h1>
        <span>{country}</span>
      </div>
      {error && <p className="course-error">{error}</p>}
      <div className="candidate-form coordinator-editor">
        <div className="course-list-actions">
          <label className="course-list-filter">
            Coordinator type
            <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
              <option value="candidate">Existing candidate</option>
              <option value="standalone">Coordinator only</option>
            </select>
          </label>
        </div>
        {kind === 'candidate' ? (
          <div className="candidate-form__grid">
            <label>
              Search candidate
              <Input
                value={candidateSearch}
                onChange={(event) => setCandidateSearch(event.target.value)}
              />
            </label>
            <label>
              Candidate
              <select
                value={candidateKey}
                onChange={(event) => {
                  setCandidateKey(event.target.value)
                  setSelectedCandidate(
                    event.target.value
                      ? (candidates.find((item) => item.enrollment_key === event.target.value) ??
                          selectedCandidate)
                      : null
                  )
                }}
              >
                <option value="">Search to select a candidate</option>
                {visibleCandidates.map((candidate) => (
                  <option value={candidate.enrollment_key} key={candidate.enrollment_key}>
                    {candidate.bbs_identifier} · {candidate.full_name}
                  </option>
                ))}
              </select>
            </label>
            {selectedCandidate && (
              <p>
                Their candidate address will also be the coordinator address:{' '}
                {selectedCandidate.address_line1 || selectedCandidate.address},{' '}
                {selectedCandidate.district}, {selectedCandidate.state}{' '}
                {selectedCandidate.postal_code}
              </p>
            )}
          </div>
        ) : (
          <div className="candidate-form__grid">
            {fields.map(({ key, label, required }) => (
              <label key={key}>
                {label}
                <Input
                  value={form[key]}
                  required={required}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                />
              </label>
            ))}
          </div>
        )}
        <label className="candidate-photo__upload">
          Coordinator photo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
          />
          {photo && <span>{photo.name}</span>}
        </label>
        <Button disabled={saving || !courseKey} onClick={() => void save()}>
          {saving ? 'Creating…' : 'Create coordinator'}
        </Button>
      </div>
      {loading && <FullScreenLoader message="Loading coordinator setup" />}
    </section>
  )
}
