import DataTable, { Column } from 'datatables.net-react'
import DataTablesCore from 'datatables.net-dt'
import 'datatables.net-dt/css'

// eslint-disable-next-line react-hooks/rules-of-hooks
DataTable.use(DataTablesCore)

export { DataTable, Column }
