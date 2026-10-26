import type { MouseEvent, RefObject } from 'react'
import type { DataTableRef } from 'datatables.net-react'
import { DataTable, Column } from '../course/dataTable'
import { resizeColumns } from '../course/resizeColumns'
import type { ShipmentPage, ShipmentRow } from './shippingApi'

function displayDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })
}

export default function ShippingTable({
  loadPage,
  table,
  onContextMenu,
  onItemsClick
}: {
  loadPage: (page: number, ordering: string) => Promise<ShipmentPage>
  table: RefObject<DataTableRef | null>
  onContextMenu: (event: MouseEvent<HTMLDivElement>) => void
  onItemsClick: (event: MouseEvent<HTMLDivElement>) => void
}): React.JSX.Element {
  return (
    <div
      className="shipping-table-wrap"
      onContextMenu={onContextMenu}
      onClick={onItemsClick}
      onPointerDown={resizeColumns}
    >
      <DataTable
        ref={table}
        className="display shipping-table"
        options={{
          pageLength: 20,
          serverSide: true,
          processing: true,
          ajax: (request, callback) => {
            const order = request.order?.[0]
            const field = order ? request.columns?.[order.column]?.data : ''
            const allowed = new Set([
              'shipped_at',
              'reference',
              'recipient',
              'phone',
              'district',
              'state',
              'items',
              'status',
              'tracking_number'
            ])
            const ordering =
              typeof field === 'string' && allowed.has(field)
                ? `${order?.dir === 'desc' ? '-' : ''}${field}`
                : '-shipped_at'
            void loadPage(Math.floor((request.start ?? 0) / (request.length || 20)) + 1, ordering)
              .then((page) =>
                callback({
                  draw: request.draw,
                  recordsTotal: page.count,
                  recordsFiltered: page.count,
                  data: page.results
                })
              )
              .catch(() =>
                callback({ draw: request.draw, recordsTotal: 0, recordsFiltered: 0, data: [] })
              )
          },
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
        <Column title="C / BBS / Order" data="reference" />
        <Column title="Recipient" data="recipient" />
        <Column title="Phone" data="phone" />
        <Column title="District" data="district" />
        <Column title="State" data="state" />
        <Column title="Items sent" data="items">
          {(_value, type, row: ShipmentRow) => {
            const count = row.items.reduce((total, item) => total + item.quantity, 0)
            return type === 'display'
              ? `<button type="button" class="shipping-items-button" data-shipping-items>${count} ${count === 1 ? 'item' : 'items'}</button>`
              : count
          }}
        </Column>
        <Column title="Status" data="status">
          {(_value, _type, row: ShipmentRow) => row.status.replaceAll('_', ' ')}
        </Column>
        <Column title="Tracking ID" data="tracking_number" options={{ defaultContent: '' }} />
      </DataTable>
    </div>
  )
}
