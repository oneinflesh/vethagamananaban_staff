import DataTable, { Column } from 'datatables.net-react'
import DataTablesCore from 'datatables.net-dt'
import 'datatables.net-buttons-dt'
import 'datatables.net-buttons/js/buttons.html5.mjs'
import 'datatables.net-buttons/js/buttons.print.mjs'
import 'datatables.net-dt/css'
import 'datatables.net-buttons-dt/css'

// eslint-disable-next-line react-hooks/rules-of-hooks
DataTable.use(DataTablesCore)

export { DataTable, Column }
