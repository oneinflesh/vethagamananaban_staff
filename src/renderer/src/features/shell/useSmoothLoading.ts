import { useCallback, useEffect, useRef, useState } from 'react'

const minimumVisibleMs = 900
const fadeOutMs = 240

export function useSmoothLoading(): {
  loading: boolean
  leaving: boolean
  start: () => void
  finish: () => void
} {
  const [loading, setLoading] = useState(true)
  const [leaving, setLeaving] = useState(false)
  const startedAt = useRef<number | null>(null)
  const leaveTimer = useRef<number | null>(null)
  const hideTimer = useRef<number | null>(null)

  const clearTimers = useCallback((): void => {
    if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current)
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current)
  }, [])

  const start = useCallback((): void => {
    clearTimers()
    startedAt.current = performance.now()
    setLeaving(false)
    setLoading(true)
  }, [clearTimers])

  const finish = useCallback((): void => {
    clearTimers()
    const remaining = Math.max(
      0,
      minimumVisibleMs - (performance.now() - (startedAt.current ?? performance.now()))
    )
    leaveTimer.current = window.setTimeout(() => {
      setLeaving(true)
      hideTimer.current = window.setTimeout(() => setLoading(false), fadeOutMs)
    }, remaining)
  }, [clearTimers])

  useEffect(() => {
    startedAt.current = performance.now()
    return clearTimers
  }, [clearTimers])

  return { loading, leaving, start, finish }
}
