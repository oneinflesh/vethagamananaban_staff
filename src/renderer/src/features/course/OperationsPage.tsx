import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useNotifications } from '../notifications/Notifications'
import FullScreenLoader from '../shell/FullScreenLoader'
import OperationsValidationPage from './OperationsValidationPage'
import OperationsHistoryPage from './OperationsHistoryPage'
import {
  getOperationsMetadata,
  getOperationsTemplate,
  uploadOperations,
  type OperationsGroup,
  type OperationsMetadata,
  type OperationsPreview,
  type OperationsRange
} from './operationsApi'
import './operations.css'

const groups: { key: OperationsGroup; label: string }[] = [
  { key: 'individual', label: 'Individuals' },
  { key: 'member', label: 'Under coordinator' },
  { key: 'coordinator', label: 'Coordinators' }
]

export default function OperationsPage({
  country,
  onBack
}: {
  country: string
  onBack: () => void
}): React.JSX.Element {
  const notify = useNotifications()
  const [metadata, setMetadata] = useState<OperationsMetadata | null>(null)
  const [group, setGroup] = useState<OperationsGroup>('individual')
  const [fields, setFields] = useState<string[]>([])
  const [bbsFrom, setBbsFrom] = useState('')
  const [bbsTo, setBbsTo] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busy, setBusy] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  const [preview, setPreview] = useState<OperationsPreview | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    let active = true
    getOperationsMetadata(country)
      .then((result) => {
        if (active) {
          setMetadata(result)
          setBbsFrom(String(result.bbs_range?.from ?? ''))
          setBbsTo(String(result.bbs_range?.to ?? ''))
        }
      })
      .catch((error: unknown) => notify.error(String(error)))
    return () => {
      active = false
    }
  }, [country, notify])

  const resetUpload = (): void => {
    setFile(null)
    setBytes(null)
    setPreview(null)
  }
  const toggle = (key: string, values: string[], update: (value: string[]) => void): void => {
    update(values.includes(key) ? values.filter((item) => item !== key) : [...values, key])
    resetUpload()
  }
  const validBbsRange = /^\d+$/.test(bbsFrom) && /^\d+$/.test(bbsTo) &&
    Number(bbsFrom) >= 1 && Number(bbsTo) >= Number(bbsFrom) && Number(bbsTo) <= 2_147_483_647
  const bbsRange: OperationsRange = group === 'coordinator' || !validBbsRange
    ? null : { from: Number(bbsFrom), to: Number(bbsTo) }
  const ready = !!metadata && (group === 'coordinator' || validBbsRange)

  async function download(): Promise<void> {
    if (!ready || !metadata) return
    setBusy('Preparing CSV')
    try {
      const result = await getOperationsTemplate(country, group, fields,
        metadata.books.map((book) => book.key), bbsRange)
      if (!result.rows) {
        notify.error('No records found in this BBS range.')
        return
      }
      const link = document.createElement('a')
      const url = URL.createObjectURL(new Blob([result.csv], { type: 'text/csv;charset=utf-8' }))
      link.href = url
      link.download = result.filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      notify.success(`${result.rows} rows downloaded`)
    } catch (error) {
      notify.error(String(error))
    } finally {
      setBusy('')
    }
  }

  async function validate(): Promise<void> {
    if (!file || !ready) return
    setBusy('Checking CSV')
    try {
      const data = new Uint8Array(await file.arrayBuffer())
      const result = await uploadOperations('preview', country, group, data, file.name, '', bbsRange)
      setBytes(data)
      setPreview(result)
      if (result.error_count) notify.error(`${result.error_count} validation errors`)
      else notify.success(`${result.change_count} changes ready to review`)
    } catch (error) {
      notify.error(String(error))
    } finally {
      setBusy('')
    }
  }

  async function applyChanges(): Promise<void> {
    if (!file || !bytes || !preview?.token || preview.error_count || !preview.change_count || !ready) return
    setBusy('Applying changes on server')
    try {
      const result = await uploadOperations(
        'apply',
        country,
        group,
        bytes,
        file.name,
        preview.token,
        bbsRange
      )
      notify.success(`${result.changes} changes saved`)
      resetUpload()
      setShowHistory(true)
    } catch (error) {
      notify.error(String(error))
    } finally {
      setBusy('')
    }
  }

  if (preview) {
    return (
      <OperationsValidationPage
        country={country}
        filename={file?.name ?? ''}
        preview={preview}
        busy={busy}
        onBack={resetUpload}
        onApply={() => void applyChanges()}
      />
    )
  }

  if (showHistory) {
    return <OperationsHistoryPage country={country} onBack={() => setShowHistory(false)} />
  }

  return (
    <section className="page operations-page">
      <div className="operations-heading">
        <Button variant="outline" onClick={onBack}>
          ← Course
        </Button>
        <h1>Operations</h1>
        <span>{country}</span>
      </div>
      <div className="operations-grid">
        <article className="operations-card">
          <div className="operations-step">1 · Select data</div>
          <h2>People and fields</h2>
          <div className="operations-group-tabs">
            {groups.map((item) => (
              <button
                key={item.key}
                type="button"
                className={group === item.key ? 'is-active' : ''}
                onClick={() => {
                  setGroup(item.key)
                  setFields([])
                  resetUpload()
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          {group !== 'coordinator' && (
            <div className="operations-bbs-range">
              <label>BBS from
                <input type="text" inputMode="numeric" value={bbsFrom} onChange={(event) => {
                  setBbsFrom(event.target.value)
                  resetUpload()
                }} />
              </label>
              <label>BBS to
                <input type="text" inputMode="numeric" value={bbsTo} onChange={(event) => {
                  setBbsTo(event.target.value)
                  resetUpload()
                }} />
              </label>
            </div>
          )}
          <p>{group === 'coordinator' ? 'C number' : 'BBS number'}, name and all marks are included.</p>
          <div className="operations-card-footer">
            <span>
              {fields.length} fields · {metadata?.books.length ?? 0} marks
            </span>
            <Button onClick={() => setPickerOpen(true)} disabled={!metadata}>
              Choose fields
            </Button>
          </div>
        </article>

        <article className={`operations-card${ready ? '' : ' operations-card--disabled'}`}>
          <div className="operations-step">2 · Download</div>
          <h2>CSV model</h2>
          <p>Download current records with the selected columns.</p>
          <div className="operations-card-footer">
            <span>UTF-8 CSV with headers</span>
            <Button onClick={() => void download()} disabled={!ready || !!busy}>
              Download CSV
            </Button>
          </div>
        </article>

        <article className={`operations-card${ready ? '' : ' operations-card--disabled'}`}>
          <div className="operations-step">3 · Upload</div>
          <h2>Check and apply</h2>
          <p>Blank cells leave existing data unchanged.</p>
          <input
            aria-label="Choose CSV"
            type="file"
            accept=".csv,text/csv"
            disabled={!ready || !!busy}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null)
              setPreview(null)
              setBytes(null)
            }}
          />
          <div className="operations-card-footer">
            <span>{file?.name ?? 'No file selected'}</span>
            <Button disabled={!file || !ready || !!busy} onClick={() => void validate()}>
              Validate
            </Button>
          </div>
        </article>

        <article className="operations-card">
          <div className="operations-step">4 · Review</div>
          <h2>History</h2>
          <p>Past imports and every changed field.</p>
          <div className="operations-card-footer">
            <span>Audit trail</span>
            <Button variant="outline" onClick={() => setShowHistory(true)}>
              View history
            </Button>
          </div>
        </article>
        <article className="operations-card operations-card--disabled">
          <div className="operations-step">5</div>
          <h2>Backup</h2>
          <p>Coming soon</p>
        </article>
        <article className="operations-card operations-card--disabled">
          <div className="operations-step">6</div>
          <h2>Restore</h2>
          <p>Coming soon</p>
        </article>
      </div>

      {pickerOpen && metadata && (
        <div
          className="operations-modal-backdrop"
          role="presentation"
          onMouseDown={() => setPickerOpen(false)}
        >
          <div
            className="operations-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Choose fields"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="operations-modal-header">
              <h2>Choose fields</h2>
              <Button variant="outline" onClick={() => setPickerOpen(false)}>
                Close
              </Button>
            </div>
            <div className="operations-modal-content">
              <section>
                <h3>Details</h3>
                <div className="operations-options">
                  {metadata.fields
                    .filter((item) =>
                      group === 'coordinator'
                        ? ![
                            'bbs_number',
                            'coordinator_number',
                            'date_of_birth',
                            'gender',
                            'phone2',
                            'education',
                            'church_background',
                            'church_background_other',
                            'language'
                          ].includes(item.key)
                        : !['bbs_number', 'name', 'coordinator_number'].includes(item.key)
                    )
                    .map((item) => (
                      <label key={item.key}>
                        <input
                          type="checkbox"
                          checked={fields.includes(item.key)}
                          onChange={() => toggle(item.key, fields, setFields)}
                        />
                        {item.label}
                      </label>
                    ))}
                </div>
              </section>
            </div>
            <div className="operations-modal-footer">
              <span>
                {fields.length} fields · {metadata.books.length} marks
              </span>
              <Button
                onClick={() => {
                  setPickerOpen(false)
                }}
              >
                Use selection
              </Button>
            </div>
          </div>
        </div>
      )}
      {busy && <FullScreenLoader message={busy} />}
    </section>
  )
}
