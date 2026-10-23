import type { Candidate, Coordinator } from './courseApi'

export type PaperSize = 'A3' | 'A4'

function labelLines(candidate: Candidate): string[] {
  return [
    candidate.bbs_identifier,
    candidate.coordinator
      ? `${candidate.full_name} c/o ${candidate.coordinator.name}`
      : candidate.full_name,
    candidate.address_line1 || candidate.address,
    candidate.address_line2,
    candidate.address_line3,
    candidate.district,
    [candidate.state, candidate.postal_code].filter(Boolean).join(' - '),
    candidate.phone
  ].filter(Boolean)
}

function printSheets(
  lines: string[][],
  title: string,
  paper: PaperSize,
  columns: number,
  rows: number,
  nameIndex: number
): void {
  const popup = window.open('', '_blank')
  if (!popup) throw new Error('Allow the print window to open, then try again.')
  const page = popup.document
  page.title = title
  const style = page.createElement('style')
  style.textContent = `
    @page { size: ${paper} portrait; margin: 5mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #111; }
    section { display: grid; grid-template-columns: repeat(${columns}, 1fr); grid-template-rows: repeat(${rows}, 1fr); height: ${paper === 'A3' ? '410mm' : '287mm'}; break-after: page; }
    section:last-child { break-after: auto; }
    article { padding: 2mm; border: 0.3mm solid #bbb; overflow: hidden; break-inside: avoid; font-size: ${paper === 'A4' ? '8pt' : '9pt'}; line-height: 1.25; overflow-wrap: anywhere; }
    p { margin: 0; }
    p:first-child { font-weight: 700; }
    p.address-name { font-size: ${paper === 'A4' ? '12pt' : '14pt'}; font-weight: 700; line-height: 1.15; margin-bottom: 1mm; }
    @media screen { body { padding: 5mm; background: #ddd; } section { background: white; width: ${paper === 'A3' ? '287mm' : '200mm'}; margin: 0 auto 5mm; } }
  `
  page.head.append(style)
  const main = page.createElement('main')
  let sheet: HTMLElement | null = null
  lines.forEach((address, index) => {
    if (index % (columns * rows) === 0) {
      sheet = page.createElement('section')
      main.append(sheet)
    }
    const label = page.createElement('article')
    address.forEach((line, lineIndex) => {
      const paragraph = page.createElement('p')
      if (lineIndex === nameIndex) paragraph.className = 'address-name'
      paragraph.textContent = line
      label.append(paragraph)
    })
    sheet!.append(label)
  })
  page.body.append(main)
  popup.focus()
  window.setTimeout(() => popup.print(), 200)
}

export function printAddressLabels(
  candidates: Candidate[],
  newRegistrations: boolean,
  paper: PaperSize = newRegistrations ? 'A4' : 'A3'
): void {
  printSheets(
    candidates.map(labelLines),
    newRegistrations ? 'New registration address labels' : 'Offline candidate address labels',
    paper,
    paper === 'A3' ? 5 : 3,
    paper === 'A3' ? 8 : 7,
    1
  )
}

export function printCoordinatorLabels(coordinators: Coordinator[], paper: PaperSize = 'A3'): void {
  printSheets(
    coordinators.map((coordinator) =>
      [
        coordinator.name,
        coordinator.address_line1,
        coordinator.address_line2,
        coordinator.address_line3,
        coordinator.district,
        [coordinator.state, coordinator.postal_code].filter(Boolean).join(' - '),
        coordinator.phone
      ].filter(Boolean)
    ),
    'Coordinator address labels',
    paper,
    paper === 'A3' ? 5 : 3,
    paper === 'A3' ? 8 : 7,
    0
  )
}

export function exportAddressCsv(candidates: Candidate[]): void {
  const columns = [
    'BBS number',
    'Name',
    'Address 1',
    'Address 2',
    'Address 3',
    'District',
    'State',
    'Pincode',
    'Phone'
  ]
  const quote = (value: unknown): string => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = [
    columns.map(quote).join(','),
    ...candidates.map((candidate) => {
      return [
        candidate.bbs_identifier,
        candidate.coordinator
          ? `${candidate.full_name} c/o ${candidate.coordinator.name}`
          : candidate.full_name,
        candidate.address_line1 || candidate.address,
        candidate.address_line2,
        candidate.address_line3,
        candidate.district,
        candidate.state,
        candidate.postal_code,
        candidate.phone
      ]
        .map(quote)
        .join(',')
    })
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'candidate-addresses.csv'
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
