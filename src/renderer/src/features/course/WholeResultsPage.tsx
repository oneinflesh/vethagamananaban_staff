import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNotifications } from '../notifications/Notifications'
import FullScreenLoader from '../shell/FullScreenLoader'
import { DataTable, Column } from './dataTable'
import { getCandidateFilterOptions, getRegistrationOptions } from './courseApi'
import {
  getWholeResults,
  saveWholeResults,
  type WholeResultCandidate,
  type WholeResultChange,
  type WholeResultsPageData
} from './wholeResultsApi'

export default function WholeResultsPage({
  country,
  onBack
}: {
  country: string
  onBack: () => void
}): React.JSX.Element {
  const notify = useNotifications()
  const [courseKey, setCourseKey] = useState('')
  const [data, setData] = useState<WholeResultsPageData | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [state, setState] = useState('')
  const [district, setDistrict] = useState('')
  const [states, setStates] = useState<string[]>([])
  const [districts, setDistricts] = useState<string[]>([])
  const [edits, setEdits] = useState<Record<string, WholeResultChange>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1)
      setQuery(search.trim())
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let active = true
    getRegistrationOptions()
      .then((result) => {
        if (active) setCourseKey(result.course.course_key)
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Could not load the course')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    getCandidateFilterOptions(country, '', '', state)
      .then((result) => {
        if (active) {
          setStates(result.states)
          setDistricts(result.districts)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [country, state])

  useEffect(() => {
    if (!courseKey) return
    let active = true
    getWholeResults(courseKey, country, page, query, state, district)
      .then((result) => {
        if (active) {
          setData(result)
          setEdits({})
          setError('')
        }
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load results')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [courseKey, country, page, query, state, district, retry])

  const changes = useMemo(() => Object.values(edits), [edits])

  function goBack(): void {
    if (changes.length && !window.confirm('Discard unsaved result changes?')) return
    onBack()
  }

  function editScore(
    candidate: WholeResultCandidate,
    examKey: string,
    input: HTMLInputElement
  ): void {
    const raw = input.value.trim()
    const score = raw === '' ? null : Number(raw)
    if (
      score !== null &&
      (!Number.isFinite(score) ||
        score < 0 ||
        score > 100 ||
        (candidate.mode === 'ONLINE' && !Number.isInteger(score)))
    ) {
      notify.error(
        candidate.mode === 'ONLINE'
          ? 'Online marks must be a whole number from 0 to 100.'
          : 'Marks must be between 0 and 100.'
      )
      input.value = String(candidate.cells[examKey]?.score ?? '')
      return
    }
    const key = `${candidate.enrollment_key}:${examKey}`
    const currentScore = candidate.cells[examKey]?.score
    const original = currentScore == null ? null : Number(currentScore)
    setEdits((current) => {
      const next = { ...current }
      if (score === original) delete next[key]
      else next[key] = { enrollment_key: candidate.enrollment_key, exam_key: examKey, score }
      return next
    })
  }

  async function save(): Promise<void> {
    if (!changes.length) return
    setSaving(true)
    try {
      const result = await saveWholeResults(changes)
      notify.success(`${result.saved} result${result.saved === 1 ? '' : 's'} saved`)
      setEdits({})
      setRetry((value) => value + 1)
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Could not save results')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page course-page">
      <div className="course-toolbar course-toolbar--results">
        <Button variant="outline" onClick={goBack}>
          ← Course
        </Button>
        <h1>Whole-course results</h1>
        <span>
          {country} · {data?.count ?? 0} candidates
        </span>
        <div className="course-title-actions">
          <label className="course-list-filter">
            State
            <select
              value={state}
              disabled={!!changes.length}
              onChange={(event) => {
                setPage(1)
                setState(event.target.value)
                setDistrict('')
              }}
            >
              <option value="">All states</option>
              {states.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="course-list-filter">
            District
            <select
              value={district}
              disabled={!!changes.length}
              onChange={(event) => {
                setPage(1)
                setDistrict(event.target.value)
              }}
            >
              <option value="">All districts</option>
              {districts.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <Input
            aria-label="Search candidates"
            disabled={!!changes.length}
            placeholder="BBS number, name or phone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button
            variant="outline"
            disabled={!!changes.length}
            onClick={() => setRetry((value) => value + 1)}
          >
            Refresh
          </Button>
          <Button disabled={!changes.length || saving} onClick={() => void save()}>
            {saving ? 'Saving…' : `Save ${changes.length} changes`}
          </Button>
        </div>
      </div>
      {error && <p className="course-error">{error}</p>}
      {data && (
        <>
          <div className="course-table-wrap course-whole-results-table">
            <DataTable
              key={`${country}:${page}:${query}:${state}:${district}:${retry}`}
              data={data.candidates}
              className="display course-table"
              options={{
                paging: false,
                searching: false,
                info: false,
                ordering: false,
                autoWidth: false,
                columnDefs: [
                  { targets: 0, width: '120px' },
                  { targets: 1, width: '220px' }
                ],
                scrollX: true,
                scrollY: 'max(220px, calc(100vh - 270px))'
              }}
            >
              <Column title="BBS number" data="bbs_number" />
              <Column title="Candidate" data="name" />
              {data.exams.map((exam) => (
                <Column key={exam.exam_key} title={`${exam.sequence}. ${exam.title}`} data="cells">
                  {(_value, _type, candidate: WholeResultCandidate) => {
                    const cell = candidate.cells[exam.exam_key]
                    return cell?.editable ? (
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step={candidate.mode === 'ONLINE' ? '1' : '0.01'}
                        defaultValue={cell.score ?? ''}
                        aria-label={`${candidate.bbs_number} ${exam.title} marks`}
                        onBlur={(event) => editScore(candidate, exam.exam_key, event.currentTarget)}
                      />
                    ) : (
                      <span className="course-result-unavailable">{cell?.score ?? '—'}</span>
                    )
                  }}
                </Column>
              ))}
            </DataTable>
          </div>
          <div className="course-results-pagination">
            <span>
              Page {page} of {Math.max(1, Math.ceil(data.count / data.page_size))}
            </span>
            <Button
              variant="outline"
              disabled={page <= 1 || !!changes.length}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page * data.page_size >= data.count || !!changes.length}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
      {loading && <FullScreenLoader message="Loading whole-course results" />}
    </section>
  )
}
