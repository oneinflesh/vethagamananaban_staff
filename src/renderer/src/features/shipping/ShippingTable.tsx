import type { MouseEvent, RefObject } from 'react'
import type { DataTableRef } from 'datatables.net-react'
import { DataTable, Column } from '../course/dataTable'
import { resizeColumns } from '../course/resizeColumns'
import type { ShipmentRow } from './shippingApi'

function displayDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })
}

export default function ShippingTable({
  rows,
  table,
  onContextMenu
}: {
  rows: ShipmentRow[]
  table: RefObject<DataTableRef | null>
  onContextMenu: (event: MouseEvent<HTMLDivElement>) => void
}): React.JSX.Element {
  return (
    <div
      className="shipping-table-wrap"
      onContextMenu={onContextMenu}
      onPointerDown={resizeColumns}
    >
      <DataTable
        ref={table}
        data={rows}
        className="display shipping-table"
        options={{
          pageLength: 20,
          lengthChange: false,
          searching: true,
          paging: true,
          info: true,
          autoWidth: false,
          order: [],
          rowId: 'key',
          createdRow: (element, data) => {
            if ((data as ShipmentRow).source === 'store')
              element.classList.add('shipping-row--store')
          },
          layout: { topStart: null, topEnd: null, bottomStart: 'info', bottomEnd: 'paging' }
        }}
      >
        <Column title="Sent date" data="shipped_at">
          {(_value, _type, row: ShipmentRow) => displayDate(row.shipped_at)}
        </Column>
        <Column title="BBS / Order" data="reference" />
        <Column title="Recipient" data="recipient" />
        <Column title="Phone" data="phone" />
        <Column title="District" data="district" />
        <Column title="State" data="state" />
        <Column title="Items sent" data="book_names" />
        <Column title="Status" data="status">
          {(_value, _type, row: ShipmentRow) => row.status.replaceAll('_', ' ')}
        </Column>
        <Column title="Tracking ID" data="tracking_number" options={{ defaultContent: '' }} />
      </DataTable>
    </div>
  )
}
