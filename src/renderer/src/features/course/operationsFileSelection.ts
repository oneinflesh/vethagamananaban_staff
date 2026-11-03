import type { OperationsGroup, OperationsRange } from './operationsApi'

type FileSelection = { country: string; group: OperationsGroup; bbsRange: OperationsRange }

export function operationsFileSelection(filename: string): FileSelection | null {
  const normalized = filename.replace(/\s*\(\d+\)(?=\.(?:xlsx|csv)$)/i, '')
  const match = /^course-([a-z]{2})-(individual|member|coordinator|range)(?:-BBS-(\d+)-to-(\d+))?\.(?:xlsx|csv)$/i.exec(normalized)
  if (!match) return null
  const group = match[2].toLowerCase() as OperationsGroup
  if (group === 'range' && (!match[3] || !match[4])) return null
  return {
    country: match[1].toUpperCase(),
    group,
    bbsRange: group === 'range' ? { from: Number(match[3]), to: Number(match[4]) } : null
  }
}
