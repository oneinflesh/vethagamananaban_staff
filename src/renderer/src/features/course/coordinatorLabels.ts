import type { Coordinator } from './courseApi'

type LabelSize = 'normal' | 'a6' | 'a5' | 'a4'

function labelSize(memberCount: number): LabelSize {
  if (memberCount < 3) return 'normal'
  if (memberCount <= 5) return 'a6'
  if (memberCount <= 10) return 'a5'
  return 'a4'
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
    section { width: 200mm; height: 287mm; break-after: page; }
    section:last-child { break-after: auto; }
    article { border: 0.3mm solid #bbb; overflow: hidden; overflow-wrap: anywhere; line-height: 1.3; }
    article.normal { width: 55mm; height: 50mm; padding: 2mm; font-size: 9pt; }
    article.a6 { width: 105mm; height: 148mm; padding: 6mm; font-size: 14pt; }
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
  coordinators.forEach((coordinator) => {
    const sheet = page.createElement('section')
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
    sheet.append(label)
    main.append(sheet)
  })
  page.body.append(main)
  popup.focus()
  window.setTimeout(() => popup.print(), 200)
}
