import type { RefObject } from 'react'
import type { DataTableRef } from 'datatables.net-react'
import { DataTable, Column } from '../course/dataTable'
import { rememberTable } from '../table/tableMemory'
import { resizeColumns } from '../course/resizeColumns'
import type { StoreParcel, StoreParcelPage } from './storeApi'

export default function StoreParcelTable({ country, table, loadPage, onSelect }: {
  country: string
  table: RefObject<DataTableRef | null>
  loadPage: (page: number, ordering: string) => Promise<StoreParcelPage>
  onSelect: (parcel: StoreParcel) => void
}): React.JSX.Element {
  return <div className="store-table-wrap" onPointerDown={resizeColumns}>
    <DataTable ref={table} className="display store-table" options={{
      ...rememberTable(`store:${country}`), serverSide: true, processing: true,
      pageLength: 20, lengthChange: false, searching: false, autoWidth: false,
      rowId: 'key', order: [[0, 'desc']],
      layout: { topStart: null, topEnd: null, bottomStart: 'info', bottomEnd: 'paging' },
      ajax: (request, callback) => {
        const field = request.columns?.[request.order?.[0]?.column ?? 0]?.data
        const allowed = new Set(['created_at', 'vn_number', 'recipient', 'district', 'state', 'status', 'total'])
        const ordering = typeof field === 'string' && allowed.has(field)
          ? `${request.order?.[0]?.dir === 'desc' ? '-' : ''}${field}` : '-created_at'
        void loadPage(Math.floor((request.start ?? 0) / (request.length || 20)) + 1, ordering)
          .then((page) => callback({ draw: request.draw, recordsTotal: page.count, recordsFiltered: page.count, data: page.results }))
          .catch(() => callback({ draw: request.draw, recordsTotal: 0, recordsFiltered: 0, data: [] }))
      }
    }}>
      <Column title="Placed" data="created_at">{(value) => new Date(String(value)).toLocaleDateString('en-GB')}</Column>
      <Column title="VN number" data="vn_number" />
      <Column title="Name" data="recipient" />
      <Column title="Orders" data="order_numbers" options={{ orderable: false }}>{(value) => (value as string[]).join(', ')}</Column>
      <Column title="Books" data="items" options={{ orderable: false }}>{(_value, _type, row: StoreParcel) =>
        row.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}</Column>
      <Column title="District" data="district" />
      <Column title="State" data="state" />
      <Column title="Total" data="total">{(value) => `₹${value}`}</Column>
      <Column title="Status" data="status">{(value) => value === 'REVIEW_REQUIRED' ? 'Stock review' : String(value).toLowerCase().replace(/^./, (letter) => letter.toUpperCase())}</Column>
      <Column title="Action" data="key" options={{ orderable: false }}>{(_value, _type, row: StoreParcel) =>
        <button className="store-action" onClick={() => onSelect(row)}>{row.status === 'REVIEW_REQUIRED' ? 'Confirm stock' : row.status === 'PROCESSING' ? 'Parcel' : row.status === 'PARCELLED' ? 'Add tracking' : 'View'}</button>}</Column>
    </DataTable>
  </div>
}
