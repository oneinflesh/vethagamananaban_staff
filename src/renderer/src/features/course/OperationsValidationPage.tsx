import { Button } from '@/components/ui/button'
import FullScreenLoader from '../shell/FullScreenLoader'
import type { OperationsPreview } from './operationsApi'
import './operationsValidation.css'

type Props = {
  country: string
  filename: string
  preview: OperationsPreview
  busy: string
  onBack: () => void
  onApply: () => void
}

export default function OperationsValidationPage({
  country,
  filename,
  preview,
  busy,
  onBack,
  onApply
}: Props): React.JSX.Element {
  const canApply = !preview.error_count && preview.change_count > 0 && Boolean(preview.token)

  return (
    <section className="page operations-validation-page">
      <div className="operations-validation-heading">
        <Button variant="outline" onClick={onBack} disabled={!!busy}>
          ← Operations
        </Button>
        <h1>Validate Excel file</h1>
        <span>{country}</span>
        <strong title={filename}>{filename}</strong>
      </div>

      <div className="operations-validation-summary">
        <div>
          <strong>{preview.rows}</strong>
          <span>Rows</span>
        </div>
        <div>
          <strong>{preview.change_count}</strong>
          <span>Changes</span>
        </div>
        <div className={preview.error_count ? 'operations-validation-summary--error' : ''}>
          <strong>{preview.error_count}</strong>
          <span>Errors</span>
        </div>
        <Button onClick={onApply} disabled={!canApply || !!busy}>
          Apply {preview.change_count} changes
        </Button>
      </div>

      {preview.error_count > 0 && (
        <section className="operations-validation-section">
          <div className="operations-validation-section-heading">
            <h2>Errors</h2>
            <span>
              {preview.error_count > preview.errors.length
                ? `First ${preview.errors.length} shown`
                : ''}
            </span>
          </div>
          <div className="operations-validation-table-wrap">
            <table className="operations-validation-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Field</th>
                  <th>Problem</th>
                </tr>
              </thead>
              <tbody>
                {preview.errors.map((item, index) => (
                  <tr className="operations-validation-error" key={index}>
                    <td>{item.row || '—'}</td>
                    <td>{item.field}</td>
                    <td>{item.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="operations-validation-section">
        <div className="operations-validation-section-heading">
          <h2>Changes</h2>
          <span>
            {preview.change_count > preview.changes.length
              ? `First ${preview.changes.length} shown`
              : ''}
          </span>
        </div>
        {preview.changes.length ? (
          <div className="operations-validation-table-wrap">
            <table className="operations-validation-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Person</th>
                  <th>Field</th>
                  <th>Current</th>
                  <th>New value</th>
                </tr>
              </thead>
              <tbody>
                {preview.changes.map((item, index) => (
                  <tr className="operations-validation-change" key={index}>
                    <td>{item.row}</td>
                    <td>{item.identifier}</td>
                    <td>{item.label}</td>
                    <td>{item.before || '—'}</td>
                    <td>{item.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="operations-validation-empty">No changes found.</p>
        )}
      </section>
      {busy && <FullScreenLoader message={busy} />}
    </section>
  )
}
