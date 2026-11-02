import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useNotifications } from '../notifications/Notifications'
import FullScreenLoader from '../shell/FullScreenLoader'
import {
  getOperationsHistory,
  getOperationsHistoryDetails,
  type OperationsHistory,
  type OperationsHistoryDetails
} from './operationsApi'
import './operationsHistory.css'

export default function OperationsHistoryPage({
  country,
  onBack
}: {
  country: string
  onBack: () => void
}): React.JSX.Element {
  const notify = useNotifications()
  const [page, setPage] = useState(1)
  const [history, setHistory] = useState<OperationsHistory | null>(null)
  const [selectedKey, setSelectedKey] = useState('')
  const [detailsPage, setDetailsPage] = useState(1)
  const [details, setDetails] = useState<OperationsHistoryDetails | null>(null)

  useEffect(() => {
    let active = true
    getOperationsHistory(country, page)
      .then((result) => {
        if (active) setHistory(result)
      })
      .catch((error: unknown) => notify.error(String(error)))
    return () => {
      active = false
    }
  }, [country, page, notify])

  useEffect(() => {
    if (!selectedKey) return
    let active = true
    getOperationsHistoryDetails(selectedKey, detailsPage)
      .then((result) => {
        if (active) setDetails(result)
      })
      .catch((error: unknown) => notify.error(String(error)))
    return () => {
      active = false
    }
  }, [selectedKey, detailsPage, notify])

  const selected = history?.results.find((item) => item.operation_key === selectedKey)

  return (
    <section className="page operations-history-page">
      <div className="operations-history-heading">
        <Button variant="outline" onClick={onBack}>
          ← Operations
        </Button>
        <h1>History</h1>
        <span>{country}</span>
        <span className="operations-history-total">{history?.count ?? 0} imports</span>
      </div>

      <div className="operations-history-list">
        <div className="operations-history-list-header">
          <span>Date and time</span>
          <span>File</span>
          <span>Group</span>
          <span>Staff</span>
          <span>Rows</span>
          <span>Changes</span>
        </div>
        {history?.results.map((item) => (
          <button
            key={item.operation_key}
            type="button"
            className={`operations-history-list-row${selectedKey === item.operation_key ? ' is-selected' : ''}`}
            onClick={() => {
              setSelectedKey(item.operation_key)
              setDetailsPage(1)
              setDetails(null)
            }}
          >
            <span>{new Date(item.created_at).toLocaleString('en-IN')}</span>
            <strong title={item.filename}>{item.filename}</strong>
            <span>{item.group}</span>
            <span>{item.actor}</span>
            <span>{item.row_count}</span>
            <span>{item.change_count}</span>
          </button>
        ))}
        {history && history.results.length === 0 && (
          <p className="operations-history-empty">No operations yet.</p>
        )}
        <div className="operations-history-pager">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span>Page {page}</span>
          <Button
            variant="outline"
            disabled={!history || page * 20 >= history.count}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {selectedKey && (
        <div className="operations-history-details">
          <div className="operations-history-details-heading">
            <h2>{selected?.filename ?? 'Changed fields'}</h2>
            <span>{details?.count ?? 0} changes</span>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedKey('')
                setDetails(null)
              }}
            >
              Close
            </Button>
          </div>
          <div className="operations-history-details-scroll">
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Field</th>
                  <th>Before</th>
                  <th>After</th>
                </tr>
              </thead>
              <tbody>
                {details?.results.map((item, index) => (
                  <tr key={index}>
                    <td>{item.identifier}</td>
                    <td>{item.field}</td>
                    <td>{item.before || '—'}</td>
                    <td>{item.after || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="operations-history-pager">
            <Button
              variant="outline"
              disabled={detailsPage <= 1}
              onClick={() => setDetailsPage(detailsPage - 1)}
            >
              Previous
            </Button>
            <span>Page {detailsPage}</span>
            <Button
              variant="outline"
              disabled={!details || detailsPage * 100 >= details.count}
              onClick={() => setDetailsPage(detailsPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      {!history && <FullScreenLoader message="Loading history" />}
    </section>
  )
}
