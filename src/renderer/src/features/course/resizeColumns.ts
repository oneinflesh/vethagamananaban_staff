import type { PointerEvent } from 'react'

export function resizeColumns(event: PointerEvent<HTMLDivElement>): void {
  const header = (event.target as HTMLElement).closest('th')
  const table = header?.closest('table')
  if (!header || !table || header.getBoundingClientRect().right - event.clientX > 12) return
  event.preventDefault()
  const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th'))
  const columns = Array.from(table.querySelectorAll<HTMLTableColElement>('colgroup col'))
  const widths = headers.map((item) => item.getBoundingClientRect().width)
  headers.forEach((item, index) => {
    item.style.width = `${widths[index]}px`
    item.style.minWidth = '70px'
  })
  columns.forEach((item, index) => {
    item.style.width = `${widths[index]}px`
  })
  const index = headers.indexOf(header)
  const initialWidth = widths[index]
  const startX = event.clientX
  const initialTableWidth = widths.reduce((sum, width) => sum + width, 0)
  const move = (pointer: globalThis.PointerEvent): void => {
    const width = Math.max(70, initialWidth + pointer.clientX - startX)
    header.style.width = `${width}px`
    if (columns[index]) columns[index].style.width = `${width}px`
    table.style.setProperty('width', `${initialTableWidth + width - initialWidth}px`, 'important')
  }
  const stop = (): void => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', stop)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', stop, { once: true })
}
