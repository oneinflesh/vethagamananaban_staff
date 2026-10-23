import { useEffect, useState } from 'react'
import { UsersRound, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getTodayEnrolment } from './dashboardApi'

export default function EnrolmentCard({ date }: { date: string }): React.JSX.Element {
  const [count, setCount] = useState<number | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    getTodayEnrolment(date)
      .then((summary) => {
        if (active) {
          setCount(summary.count)
          setError(false)
        }
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [date, attempt])

  useEffect(() => {
    const timer = window.setInterval(() => setAttempt((value) => value + 1), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <Card className="dashboard-card dashboard-card--enrolment">
      <div className="dashboard-card__top">
        <span className="dashboard-card__icon">
          <UsersRound size={22} />
        </span>
        <span className="dashboard-card__eyebrow">TODAY</span>
      </div>
      <div>
        <p className="dashboard-card__label">Today’s Enrolment</p>
        {error ? (
          <div className="dashboard-card__error">
            <span>Couldn’t load enrolments</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Retry enrolments"
              onClick={() => setAttempt((value) => value + 1)}
            >
              <RefreshCw size={16} />
            </Button>
          </div>
        ) : (
          <strong className="dashboard-card__number" aria-live="polite">
            {count ?? '—'}
          </strong>
        )}
      </div>
    </Card>
  )
}
