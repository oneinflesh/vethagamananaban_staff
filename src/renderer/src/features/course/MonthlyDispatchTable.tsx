import { useEffect, useRef, type MouseEvent } from 'react'
import type { DataTableRef } from 'datatables.net-react'
import { DataTable, Column } from './dataTable'
import { resizeColumns } from './resizeColumns'
import type { MonthlyAllocation, MonthlyStudent } from './courseApi'

export type DispatchRow = MonthlyAllocation & { kind: 'allocation' | 'funded' }
export type DispatchView = 'dispatch' | 'unpaid' | 'previous'

function dateLabel(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB')
}

export default function MonthlyDispatchTable({
  rows,
  unpaid,
  view,
  search,
  onCandidate,
  onContextMenu
}: {
  rows: DispatchRow[]
  unpaid: MonthlyStudent[]
  view: DispatchView
  search: string
  onCandidate: (key: string) => void
  onContextMenu: (event: MouseEvent<HTMLDivElement>) => void
}): React.JSX.Element {
  const table = useRef<DataTableRef>(null)
  useEffect(() => {
    table.current?.dt()?.search(search).draw()
  }, [search, view])

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
          data={rows}
          className="display course-table"
          options={{
            pageLength: 20,
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
          <Column title="Book" data="exam_title" />
          <Column title="Paid" data="payment_amount" />
          <Column title="Purchased" data="purchased_at">
            {(_value, _type, row: DispatchRow) => dateLabel(row.purchased_at)}
          </Column>
          <Column title="Status" data="status" />
          <Column title="Tracking ID" data="tracking_number" options={{ defaultContent: '' }} />
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
          data={unpaid}
          className="display course-table"
          options={{
            pageLength: 20,
            lengthChange: false,
            searching: true,
            paging: true,
            info: true,
            autoWidth: false,
            order: [],
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
        </DataTable>
      )}
    </div>
  )
}
