import { DataTable, Column } from './dataTable'
import type { ExamResult } from './courseApi'

export default function ExamResultsTable({
  results
}: {
  results: ExamResult[]
}): React.JSX.Element {
  return (
    <div className="course-table-wrap">
      <DataTable
        data={results}
        className="display course-table"
        options={{ paging: false, searching: false, info: false, order: [] }}
      >
        <Column title="Exam" data="exam_number" />
        <Column title="Book / exam" data="exam_title" />
        <Column title="Mode" data="mode" />
        <Column title="Status" data="status" />
        <Column title="Marks" data="score" options={{ defaultContent: '—' }} />
      </DataTable>
    </div>
  )
}
