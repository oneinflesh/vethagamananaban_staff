import type { Candidate, MonthlyAddress } from './courseApi'

export type PaperSize = 'A3' | 'A4'

function labelLines(candidate: Candidate): string[] {
  return [
    candidate.bbs_identifier,
    candidate.full_name,
    candidate.address_line1,
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
  landscape = false
): void {
  const popup = window.open('', '_blank')
  if (!popup) throw new Error('Allow the print window to open, then try again.')
  const page = popup.document
  page.title = title
  const style = page.createElement('style')
  style.textContent = `
    @page { size: ${paper} ${landscape ? 'landscape' : 'portrait'}; margin: 5mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #111; }
    section { display: grid; grid-template-columns: repeat(${columns}, 1fr); grid-template-rows: repeat(${rows}, 1fr); height: ${paper === 'A3' ? '410mm' : landscape ? '200mm' : '287mm'}; break-after: page; }
    section:last-child { break-after: auto; }
    article { padding: 2mm; border: 0.3mm solid #bbb; overflow: hidden; break-inside: avoid; font-size: ${paper === 'A4' ? '8pt' : '9pt'}; line-height: 1.25; overflow-wrap: anywhere; }
    p { margin: 0; }
    p:first-child, p:nth-child(2) { font-weight: 700; }
    @media screen { body { padding: 5mm; background: #ddd; } section { background: white; width: ${paper === 'A3' ? '287mm' : landscape ? '287mm' : '200mm'}; margin: 0 auto 5mm; } }
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
    address.forEach((line) => {
      const paragraph = page.createElement('p')
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
    paper === 'A3' ? 8 : 7
  )
}

export function printMonthlyAddressLabels(addresses: MonthlyAddress[], paper: PaperSize): void {
  printSheets(
    addresses.map((item) =>
      [
        item.bbs_number,
        item.name,
        item.line1,
        item.line2,
        item.landmark,
        item.district,
        [item.state, item.postal_code].filter(Boolean).join(' - '),
        item.country,
        item.phone
      ].filter(Boolean)
    ),
    'Monthly dispatch address labels',
    paper,
    paper === 'A3' ? 5 : 4,
    paper === 'A3' ? 8 : 5,
    paper === 'A4'
  )
}

export function exportMonthlyAddressCsv(addresses: MonthlyAddress[]): void {
  const rows = [
    [
      'BBS Number',
      'Name',
      'Address Line 1',
      'Address Line 2',
      'Landmark',
      'District',
      'State',
      'Country',
      'Pincode',
      'Phone'
    ],
    ...addresses.map((item) => [
      item.bbs_number,
      item.name,
      item.line1,
      item.line2,
      item.landmark,
      item.district,
      item.state,
      item.country,
      item.postal_code,
      item.phone
    ])
  ]
  const csv = rows
    .map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'monthly-addresses.csv'
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportAddressCsv(candidates: Candidate[]): void {
  const columns: (keyof Candidate)[] = [
    'bbs_identifier',
    'full_name',
    'address_line1',
    'address_line2',
    'address_line3',
    'district',
    'state',
    'postal_code',
    'phone',
    'phone2'
  ]
  const quote = (value: unknown): string => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = [
    columns.map(quote).join(','),
    ...candidates.map((candidate) => columns.map((column) => quote(candidate[column])).join(','))
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'candidate-addresses.csv'
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
