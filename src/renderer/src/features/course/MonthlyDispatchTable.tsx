import { type MouseEvent, type RefObject } from 'react'
import type { DataTableRef } from 'datatables.net-react'
import { Button } from '@/components/ui/button'
import { DataTable, Column } from './dataTable'
import { resizeColumns } from './resizeColumns'
import type { MonthlyAllocation, MonthlyPage, MonthlyStudent } from './courseApi'

export type DispatchRow = MonthlyAllocation & { kind: 'allocation' | 'funded' }
export type DispatchView = 'dispatch' | 'previous'

function dateLabel(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB')
}

export default function MonthlyDispatchTable({
  loadPage,
  table,
  view,
  savingTrackingKey,
  onParcel,
  onTrackingSave,
  onCreditProcess,
  onCandidate,
  onContextMenu
}: {
  loadPage: (page: number) => Promise<MonthlyPage>
  table: RefObject<DataTableRef | null>
  view: DispatchView
  savingTrackingKey: string | null
  onParcel: (row: DispatchRow) => void
  onTrackingSave: (row: DispatchRow, value: string) => Promise<boolean>
  onCreditProcess: (row: MonthlyStudent) => void
  onCandidate: (key: string) => void
  onContextMenu: (event: MouseEvent<HTMLDivElement>) => void
}): React.JSX.Element {
  const ajax = (
    request: { start?: number; length?: number; draw?: number },
    callback: (response: unknown) => void
  ): void => {
    void loadPage(Math.floor((request.start ?? 0) / (request.length || 20)) + 1)
      .then((page) =>
        callback({
          draw: request.draw,
          recordsTotal: page.count,
          recordsFiltered: page.count,
          data: page.results
        })
      )
      .catch(() => callback({ draw: request.draw, recordsTotal: 0, recordsFiltered: 0, data: [] }))
  }

  return (
    <div
      className="course-table-wrap course-table-wrap--candidates"
      onContextMenu={onContextMenu}
      onPointerDown={resizeColumns}
    >
      {view === 'dispatch' ? (
        <DataTable
          key="dispatch"
          ref={table}
          className="display course-table"
          options={{
            pageLength: 20,
            serverSide: true,
            processing: true,
            ajax,
            ordering: false,
            lengthChange: false,
            searching: true,
            paging: true,
            info: true,
            autoWidth: false,
            order: [],
            rowId: 'allocation_key',
            layout: { topStart: null, topEnd: null, bottomStart: 'info', bottomEnd: 'paging' }
          }}
        >
          <Column title="BBS number" data="bbs_number">
            {(_value, _type, row: DispatchRow) => (
              <button className="course-link" onClick={() => onCandidate(row.enrollment_key)}>
                {row.bbs_number}
              </button>
            )}
          </Column>
          <Column title="Student" data="student_name" />
          <Column title="Phone" data="student_phone" />
          <Column title="Payment / credit" data="payment_amount">
            {(_value, _type, row: DispatchRow) => row.credit_amount ? `Credit ₹${row.credit_amount}` : row.payment_amount}
          </Column>
          <Column title="Purchased" data="purchased_at">
            {(_value, _type, row: DispatchRow) => dateLabel(row.purchased_at)}
          </Column>
          <Column title="Status" data="status" />
          <Column title="Tracking ID" data="tracking_number" options={{ defaultContent: '' }}>
            {(_value, _type, row: DispatchRow) =>
              row.status === 'PROCESSING' ? (
                <Button variant="outline" onClick={() => onParcel(row)}>Mark Parcelled</Button>
              ) : row.kind === 'funded' ? '—' : (
                <div className="course-tracking-cell">
                  <input
                    key={`${row.allocation_key}:${row.tracking_number}`}
                    aria-label={`Tracking ID for ${row.bbs_number}`}
                    title="Press Enter to save tracking ID"
                    defaultValue={row.tracking_number ?? ''}
                    maxLength={100}
                    disabled={savingTrackingKey === row.allocation_key}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void onTrackingSave(row, event.currentTarget.value)
                      }
                    }}
                  />
                  {savingTrackingKey === row.allocation_key && <span>Saving…</span>}
                </div>
              )
            }
          </Column>
          <Column title="Address" data="delivery_address.city" options={{ defaultContent: '' }}>
            {(_value, _type, row: DispatchRow) =>
              row.delivery_address?.city
                ? `${row.delivery_address.city}, ${row.delivery_address.state ?? ''} ${row.delivery_address.postal_code ?? ''}`
                : '—'
            }
          </Column>
        </DataTable>
      ) : (
        <DataTable
          key={view}
          ref={table}
          className="display course-table"
          options={{
            pageLength: 20,
            serverSide: true,
            processing: true,
            ajax,
            ordering: false,
            lengthChange: false,
            searching: true,
            paging: true,
            info: true,
            autoWidth: false,
            order: [],
            rowId: 'enrollment_key',
            layout: { topStart: null, topEnd: null, bottomStart: 'info', bottomEnd: 'paging' }
          }}
        >
          <Column title="BBS number" data="bbs_number">
            {(_value, _type, row: MonthlyStudent) => (
              <button className="course-link" onClick={() => onCandidate(row.enrollment_key)}>
                {row.bbs_number}
              </button>
            )}
          </Column>
          <Column title="Student" data="name" />
          <Column title="Phone" data="phone" />
          <Column title="Action" data="enrollment_key">{(_value, _type, row: MonthlyStudent) => <Button variant="outline" onClick={() => onCreditProcess(row)}>Make credit and process</Button>}</Column>
        </DataTable>
      )}
    </div>
  )
}
