import type { Coordinator } from './courseApi'

type LabelSize = 'normal' | 'a6' | 'a5' | 'a4'
type LabelRow = { size: LabelSize; coordinators: Coordinator[]; height: number }

const rowHeight: Record<LabelSize, number> = { normal: 50, a6: 138, a5: 141, a4: 287 }
const labelsPerRow: Record<LabelSize, number> = { normal: 3, a6: 2, a5: 1, a4: 1 }
const sheetHeight = 287
const rowGap = 2

function labelSize(memberCount: number): LabelSize {
  if (memberCount < 3) return 'normal'
  if (memberCount <= 5) return 'a6'
  if (memberCount <= 10) return 'a5'
  return 'a4'
}

function packSheets(coordinators: Coordinator[]): LabelRow[][] {
  const bySize: Record<LabelSize, Coordinator[]> = { normal: [], a6: [], a5: [], a4: [] }
  coordinators.forEach((coordinator) =>
    bySize[labelSize(coordinator.member_count)].push(coordinator)
  )
  const rows: LabelRow[] = []
  for (const size of ['a4', 'a5', 'a6', 'normal'] as const) {
    const entries = bySize[size]
    for (let index = 0; index < entries.length; index += labelsPerRow[size]) {
      rows.push({
        size,
        coordinators: entries.slice(index, index + labelsPerRow[size]),
        height: rowHeight[size]
      })
    }
  }
  const sheets: LabelRow[][] = []
  rows.forEach((row) => {
    const matchingSheet = sheets.find(
      (sheet) =>
        sheet.reduce((height, item) => height + item.height, 0) +
          sheet.length * rowGap +
          row.height <=
        sheetHeight
    )
    if (matchingSheet) matchingSheet.push(row)
    else sheets.push([row])
  })
  return sheets
}

function createLabel(page: Document, coordinator: Coordinator): HTMLElement {
  const label = page.createElement('article')
  label.className = labelSize(coordinator.member_count)
  if (coordinator.enrollment_key && coordinator.bbs_number) {
    const bbsNumber = page.createElement('p')
    bbsNumber.textContent = coordinator.bbs_number
    label.append(bbsNumber)
  }
  const name = page.createElement('p')
  name.className = 'address-name'
  name.textContent = coordinator.name
  label.append(name)
  const lines = [
    coordinator.address_line1,
    coordinator.address_line2,
    coordinator.address_line3,
    coordinator.district,
    [coordinator.state, coordinator.postal_code].filter(Boolean).join(' - '),
    coordinator.phone
  ]
  lines.forEach((line) => {
    if (!line) return
    const paragraph = page.createElement('p')
    paragraph.textContent = line
    label.append(paragraph)
  })
  return label
}

export function printCoordinatorLabels(coordinators: Coordinator[]): void {
  const popup = window.open('', '_blank')
  if (!popup) throw new Error('Allow the print window to open, then try again.')
  const page = popup.document
  page.title = 'Coordinator address labels'
  const style = page.createElement('style')
  style.textContent = `
    @page { size: A4 portrait; margin: 5mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #111; }
    section { width: 200mm; height: 287mm; break-after: page; display: flex; flex-direction: column; gap: 2mm; }
    section:last-child { break-after: auto; }
    .label-row { display: flex; gap: 2mm; flex: none; }
    article { border: 0.3mm solid #bbb; overflow: hidden; overflow-wrap: anywhere; line-height: 1.3; }
    article.normal { width: 55mm; height: 50mm; padding: 2mm; font-size: 9pt; }
    article.a6 { width: 95mm; height: 138mm; padding: 6mm; font-size: 14pt; }
    article.a5 { width: 200mm; height: 141mm; padding: 9mm; font-size: 19pt; }
    article.a4 { width: 200mm; height: 287mm; padding: 12mm; font-size: 24pt; }
    p { margin: 0 0 0.35em; }
    p.address-name { font-weight: 700; line-height: 1.15; margin-bottom: 0.6em; }
    article.normal p.address-name { font-size: 12pt; }
    article.a6 p.address-name { font-size: 18pt; }
    article.a5 p.address-name { font-size: 24pt; }
    article.a4 p.address-name { font-size: 30pt; }
    @media screen { body { padding: 5mm; background: #ddd; } section { background: white; margin: 0 auto 5mm; } }
  `
  page.head.append(style)
  const main = page.createElement('main')
  packSheets(coordinators).forEach((rows) => {
    const sheet = page.createElement('section')
    rows.forEach((row) => {
      const wrapper = page.createElement('div')
      wrapper.className = 'label-row'
      row.coordinators.forEach((coordinator) => wrapper.append(createLabel(page, coordinator)))
      sheet.append(wrapper)
    })
    main.append(sheet)
  })
  page.body.append(main)
  popup.focus()
  window.setTimeout(() => popup.print(), 200)
}
