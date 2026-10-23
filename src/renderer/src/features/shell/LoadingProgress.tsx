import { useEffect, useState } from 'react'

export default function LoadingProgress({
  complete = false,
  durationMs = 2200
}: {
  complete?: boolean
  durationMs?: number
}): React.JSX.Element {
  const [progress, setProgress] = useState(1)

  useEffect(() => {
    if (complete) return
    const started = performance.now()
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - started
      setProgress(Math.min(95, 1 + Math.floor((elapsed / durationMs) * 94)))
    }, 40)
    return () => window.clearInterval(timer)
  }, [complete, durationMs])

  const value = complete ? 100 : progress
  return (
    <div
      className="loading-progress"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span className="loading-progress__number">{value}%</span>
      <div className="loading-progress__track" aria-hidden="true">
        <div className="loading-progress__fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}
