import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import FullScreenLoader from '../shell/FullScreenLoader'
import { useSmoothLoading } from '../shell/useSmoothLoading'
import { getEnrolmentSummary } from './dashboardApi'
import { enrolmentRange, type EnrolmentPeriod } from './enrolmentPeriod'

export default function EnrolmentCard({ date }: { date: string }): React.JSX.Element {
  const [result, setResult] = useState<{ range: string; count: number } | null>(null)
  const [failedRange, setFailedRange] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const { loading, leaving, start, finish } = useSmoothLoading()
  const [period, setPeriod] = useState<EnrolmentPeriod>('today')
  const [customDate, setCustomDate] = useState(date)
  const { startDate, endDate } = enrolmentRange(date, period, customDate)
  const range = `${startDate}:${endDate}`

  useEffect(() => {
    let active = true
    getEnrolmentSummary(startDate, endDate)
      .then((summary) => {
        if (active) {
          setResult({ range, count: summary.count })
          setFailedRange(null)
        }
      })
      .catch(() => {
        if (active) setFailedRange(range)
      })
      .finally(() => {
        if (active) finish()
      })
    return () => {
      active = false
    }
  }, [startDate, endDate, range, attempt, finish])

  useEffect(() => {
    const timer = window.setInterval(() => {
      start()
      setAttempt((value) => value + 1)
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [start])

  const showLoader = loading || (result?.range !== range && failedRange !== range)

  return (
    <>
      <Card className="dashboard-card dashboard-card--enrolment">
        <div className="dashboard-card__top">
          <span className="dashboard-card__label">Enrolments</span>
          <select
            className="dashboard-period"
            aria-label="Enrolment period"
            value={period}
            onChange={(event) => {
              start()
              setPeriod(event.target.value as EnrolmentPeriod)
            }}
          >
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
            <option value="custom">Custom date</option>
          </select>
        </div>
        <div className="dashboard-card__bottom">
          {period === 'custom' && (
            <input
              className="dashboard-custom-date"
              type="date"
              aria-label="Choose enrolment date"
              max={date}
              value={customDate}
              onChange={(event) => {
                if (event.target.value) {
                  start()
                  setCustomDate(event.target.value)
                }
              }}
            />
          )}
          {failedRange === range ? (
            <div className="dashboard-card__error">
              <span>Couldn’t load</span>
              <Button
                variant="link"
                size="xs"
                onClick={() => {
                  start()
                  setAttempt((value) => value + 1)
                }}
              >
                Retry
              </Button>
            </div>
          ) : (
            <strong className="dashboard-card__number" aria-live="polite">
              {result?.range === range ? result.count : '—'}
            </strong>
          )}
        </div>
      </Card>
      {showLoader && <FullScreenLoader message="Loading enrolments" leaving={leaving} />}
    </>
  )
}
