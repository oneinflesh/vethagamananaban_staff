import type { Candidate } from './courseApi'

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

export function printAddressLabels(candidates: Candidate[], newRegistrations: boolean): void {
  const popup = window.open('', '_blank')
  if (!popup) throw new Error('Allow the print window to open, then try again.')
  const page = popup.document
  page.title = newRegistrations
    ? 'New registration address labels'
    : 'Offline candidate address labels'
  const style = page.createElement('style')
  style.textContent = `
    @page { size: ${newRegistrations ? 'A4' : 'A3'} portrait; margin: 5mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #111; }
    section { display: grid; grid-template-columns: repeat(${newRegistrations ? 3 : 5}, 1fr); grid-auto-rows: ${newRegistrations ? '40mm' : '51.25mm'}; break-after: page; }
    section:last-child { break-after: auto; }
    article { padding: 2mm; border: 0.3mm solid #bbb; overflow: hidden; break-inside: avoid; font-size: ${newRegistrations ? '8pt' : '9pt'}; line-height: 1.25; overflow-wrap: anywhere; }
    p { margin: 0; }
    p:first-child, p:nth-child(2) { font-weight: 700; }
    @media screen { body { padding: 5mm; background: #ddd; } section { background: white; max-width: ${newRegistrations ? '200mm' : '287mm'}; margin: 0 auto 5mm; } }
  `
  page.head.append(style)
  const main = page.createElement('main')
  let sheet: HTMLElement | null = null
  const perSheet = newRegistrations ? 21 : 40
  candidates.forEach((candidate, index) => {
    if (index % perSheet === 0) {
      sheet = page.createElement('section')
      main.append(sheet)
    }
    const label = page.createElement('article')
    labelLines(candidate).forEach((line) => {
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
