import { useLayoutEffect, useRef, type RefObject } from 'react'

export default function useDispatchTableHeight(view: string): RefObject<HTMLElement | null> {
  const pageRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const page = pageRef.current
    if (!page) return
    const root = page
    let frame = 0

    function measure(): void {
      const table = root.querySelector<HTMLElement>('.course-manual-dispatch-table')
      if (!table) return
      const header = table.querySelector<HTMLElement>('.dt-scroll-head')?.getBoundingClientRect().height ?? 40
      const footer = table.querySelector<HTMLElement>('.dt-layout-row:last-child:not(.dt-layout-table)')
        ?.getBoundingClientRect().height ?? 48
      const bottomPadding = Number.parseFloat(getComputedStyle(root).paddingBottom) || 0
      const available = root.getBoundingClientRect().bottom - table.getBoundingClientRect().top
        - bottomPadding - header - footer - 2
      const height = `${Math.max(80, Math.floor(available))}px`
      if (root.style.getPropertyValue('--dispatch-table-height') !== height) {
        root.style.setProperty('--dispatch-table-height', height)
      }
    }

    function scheduleMeasure(): void {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }

    const observer = new ResizeObserver(scheduleMeasure)
    observer.observe(page)
    const table = page.querySelector<HTMLElement>('.course-manual-dispatch-table')
    if (table) observer.observe(table)
    window.addEventListener('resize', scheduleMeasure)
    scheduleMeasure()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', scheduleMeasure)
    }
  }, [view])

  return pageRef
}
