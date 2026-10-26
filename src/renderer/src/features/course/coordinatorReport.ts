import type { Coordinator } from './courseApi'

export function printCoordinatorReport(coordinators: Coordinator[], country: string): void {
  const popup = window.open('', '_blank')
  if (!popup) throw new Error('Allow the print window to open, then try again.')

  const page = popup.document
  page.title = `${country} coordinator list`
  const style = page.createElement('style')
  style.textContent = `
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111; font-family: Arial, sans-serif; font-size: 10pt; }
    h1 { margin: 0 0 3mm; font-size: 16pt; }
    .subtitle { margin: 0 0 6mm; color: #444; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    th, td { padding: 2.5mm 2mm; border: 0.25mm solid #aaa; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
    th { background: #f2f2f2; font-weight: 700; }
    th:nth-child(1) { width: 12%; }
    th:nth-child(2) { width: 23%; }
    th:nth-child(3) { width: 19%; }
    th:nth-child(4) { width: 15%; }
    th:nth-child(5) { width: 16%; }
    th:nth-child(6) { width: 15%; }
  `
  page.head.append(style)

  const heading = page.createElement('h1')
  heading.textContent = 'List of Coordinators'
  const subtitle = page.createElement('p')
  subtitle.className = 'subtitle'
  subtitle.textContent = `${country} · ${coordinators.length} coordinators`
  page.body.append(heading, subtitle)

  const table = page.createElement('table')
  const header = table.createTHead().insertRow()
  for (const title of ['C. no', 'Name', 'Is candidate', 'No. of people', 'District', 'State']) {
    const cell = page.createElement('th')
    cell.textContent = title
    header.append(cell)
  }
  const body = table.createTBody()
  for (const coordinator of [...coordinators].sort((left, right) => left.number - right.number)) {
    const row = body.insertRow()
    for (const value of [
      `C-${coordinator.number}`,
      coordinator.name,
      coordinator.bbs_number || 'Coordinator',
      String(coordinator.member_count + (coordinator.bbs_number ? 1 : 0)),
      coordinator.district || '—',
      coordinator.state || '—'
    ]) {
      const cell = row.insertCell()
      cell.textContent = value
    }
  }
  page.body.append(table)
  popup.focus()
  window.setTimeout(() => popup.print(), 200)
}
