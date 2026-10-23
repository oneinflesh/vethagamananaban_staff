import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useNotifications } from '../notifications/Notifications'
import { DataTable, Column } from './dataTable'
import { updateAllocationScore, type ExamResult } from './courseApi'

export default function ExamResultsTable({
  results,
  allocations,
  onUpdated
}: {
  results: ExamResult[]
  allocations: {
    allocation_key: string
    exam_number: number
    exam_title: string
    status: string
    score: number | null
  }[]
  onUpdated: () => Promise<void>
}): React.JSX.Element {
  const [editing, setEditing] = useState<string | null>(null)
  const [score, setScore] = useState('')
  const [saving, setSaving] = useState(false)
  const notify = useNotifications()

  async function saveScore(): Promise<void> {
    if (!editing) return
    const value = score.trim() === '' ? null : Number(score)
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 100)) {
      notify.error('Marks must be between 0 and 100.')
      return
    }
    setSaving(true)
    try {
      await updateAllocationScore(editing, value)
      await onUpdated()
      setEditing(null)
      notify.success('Marks saved')
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not save marks')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="course-table-wrap">
        <DataTable
          data={results}
          className="display course-table"
          options={{ paging: false, searching: false, info: false, order: [] }}
        >
          <Column title="Exam" data="exam_number" />
          <Column title="Book / exam" data="exam_title" />
          <Column title="Mode" data="mode" />
          <Column title="Status" data="status" />
          <Column title="Marks" data="score" options={{ defaultContent: '—' }} />
        </DataTable>
      </div>
      {allocations.length > 0 && (
        <div className="course-table-wrap course-marks-allocations">
          <h2>Offline marks</h2>
          <DataTable
            data={allocations}
            className="display course-table"
            options={{ paging: false, searching: false, info: false, order: [] }}
          >
            <Column title="Exam" data="exam_number" />
            <Column title="Book" data="exam_title" />
            <Column title="Status" data="status" />
            <Column title="Marks" data="score" options={{ defaultContent: '—' }} />
            <Column title="Action" data="allocation_key" options={{ orderable: false }}>
              {(_value, _type, row: (typeof allocations)[number]) => (
                <button
                  className="course-link"
                  onClick={() => {
                    setEditing(row.allocation_key)
                    setScore(row.score === null ? '' : String(row.score))
                  }}
                >
                  Edit marks
                </button>
              )}
            </Column>
          </DataTable>
        </div>
      )}
      {editing && (
        <div className="course-marks-editor">
          <label>
            Marks (0–100)
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={score}
              onChange={(event) => setScore(event.target.value)}
            />
          </label>
          <Button disabled={saving} onClick={() => void saveScore()}>
            Save marks
          </Button>
          <Button variant="outline" onClick={() => setEditing(null)}>
            Cancel
          </Button>
        </div>
      )}
    </>
  )
}
