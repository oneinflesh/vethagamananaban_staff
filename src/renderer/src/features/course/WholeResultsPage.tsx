import { useEffect, useRef, useState } from 'react'
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
  const savingCells = useRef(new Set<string>())
  const failedCells = useRef(new Set<string>())
  const failedValues = useRef(new Map<string, string>())
  const savedScores = useRef(new Map<string, number | null>())
  const [savingCount, setSavingCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [loading, setLoading] = useState(true)
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
          savedScores.current.clear()
          failedValues.current.clear()
          setData(result)
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

  function goBack(): void {
    const focused = document.activeElement
    if (focused instanceof HTMLInputElement && focused.dataset.resultScore === 'true') focused.blur()
    if (savingCells.current.size || failedCells.current.size) {
      notify.error(failedCells.current.size ? 'Retry the highlighted mark before leaving' : 'Wait for the mark to save')
      return
    }
    onBack()
  }

  async function saveScore(
    candidate: WholeResultCandidate,
    examKey: string,
    input: HTMLInputElement
  ): Promise<void> {
    const key = `${candidate.enrollment_key}:${examKey}`
    if (savingCells.current.has(key)) return
    const raw = input.value.trim()
    const score = raw === '' ? null : Number(raw)
    if (
      (raw !== '' && !/^\d{1,3}$/.test(raw)) ||
      (score !== null && score > 100)
    ) {
      notify.error('Marks must be a whole number from 0 to 100.')
      input.value = String(candidate.cells[examKey]?.score ?? '')
      return
    }
    const currentScore = savedScores.current.has(key) ? savedScores.current.get(key) : candidate.cells[examKey]?.score
    const original = currentScore == null ? null : Number(currentScore)
    if (score === original) {
      failedCells.current.delete(key)
      failedValues.current.delete(key)
      setFailedCount(failedCells.current.size)
      input.removeAttribute('aria-invalid')
      return
    }
    savingCells.current.add(key)
    setSavingCount(savingCells.current.size)
    input.disabled = true
    try {
      const change: WholeResultChange = { enrollment_key: candidate.enrollment_key, exam_key: examKey, score }
      await saveWholeResults([change])
      candidate.cells[examKey].score = score
      savedScores.current.set(key, score)
      failedCells.current.delete(key)
      failedValues.current.delete(key)
      setFailedCount(failedCells.current.size)
      input.removeAttribute('aria-invalid')
    } catch (cause) {
      failedCells.current.add(key)
      failedValues.current.set(key, raw)
      setFailedCount(failedCells.current.size)
      input.setAttribute('aria-invalid', 'true')
      notify.error(cause instanceof Error ? cause.message : 'Could not save results')
    } finally {
      savingCells.current.delete(key)
      setSavingCount(savingCells.current.size)
      input.disabled = false
    }
  }

  function moveVertically(input: HTMLInputElement, direction: -1 | 1): void {
    const cell = input.closest('td')
    let row: Element | null = input.closest('tr')
    if (!cell || !row) return
    while ((row = direction === 1 ? row.nextElementSibling : row.previousElementSibling)) {
      const next = row.querySelectorAll('td')[cell.cellIndex]?.querySelector<HTMLInputElement>('input[data-result-score="true"]')
      if (next && !next.disabled) {
        next.focus()
        next.select()
        return
      }
    }
    input.blur()
  }

  function changePage(next: number): void {
    const focused = document.activeElement
    if (focused instanceof HTMLInputElement && focused.dataset.resultScore === 'true') focused.blur()
    if (savingCells.current.size || failedCells.current.size) return
    setPage(next)
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
              disabled={!!savingCount || !!failedCount}
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
              disabled={!!savingCount || !!failedCount}
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
            disabled={!!savingCount || !!failedCount}
            placeholder="BBS number, name or phone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button
            variant="outline"
            disabled={!!savingCount || !!failedCount}
            onClick={() => setRetry((value) => value + 1)}
          >
            Refresh
          </Button>
          <span className="course-results-save-status" role="status">
            {savingCount ? 'Saving…' : failedCount ? 'Save failed — retry the highlighted mark' : ''}
          </span>
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
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={3}
                        defaultValue={failedValues.current.get(`${candidate.enrollment_key}:${exam.exam_key}`) ??
                          (savedScores.current.has(`${candidate.enrollment_key}:${exam.exam_key}`)
                            ? savedScores.current.get(`${candidate.enrollment_key}:${exam.exam_key}`) ?? ''
                            : cell.score ?? '')}
                        aria-invalid={failedCells.current.has(`${candidate.enrollment_key}:${exam.exam_key}`) || undefined}
                        data-result-score="true"
                        aria-label={`${candidate.bbs_number} ${exam.title} marks`}
                        onBlur={(event) => void saveScore(candidate, exam.exam_key, event.currentTarget)}
                        onPaste={(event) => {
                          if (!/^\d{1,3}$/.test(event.clipboardData.getData('text').trim())) event.preventDefault()
                        }}
                        onKeyDown={(event) => {
                          if (['.', ',', '-', '+', 'e', 'E'].includes(event.key)) {
                            event.preventDefault()
                            return
                          }
                          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
                          event.preventDefault()
                          moveVertically(event.currentTarget, event.key === 'ArrowDown' ? 1 : -1)
                        }}
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
              disabled={page <= 1 || !!savingCount || !!failedCount}
              onClick={() => changePage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page * data.page_size >= data.count || !!savingCount || !!failedCount}
              onClick={() => changePage(page + 1)}
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
