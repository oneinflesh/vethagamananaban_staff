import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import DateCard from './DateCard'
import EnrolmentCard from './EnrolmentCard'
import { indiaDateKey } from './dashboardApi'
import './dashboard.css'
import { countries, useCountry } from '../country/CountryContext'

export default function DashboardPage(): React.JSX.Element {
  const [now, setNow] = useState(() => new Date())
  const { country, setCountry } = useCountry()

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <section className="page dashboard-page">
      <div className="dashboard-welcome">
        <label className="dashboard-country">
          Country
          <select value={country} onChange={(event) => setCountry(event.target.value)}>
            {countries.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <span className="dashboard-welcome__accent" aria-hidden="true" />
        <h1 lang="ta">வணக்கம் வேதாகம நண்பன்</h1>
      </div>
      <div className="dashboard-grid">
        <EnrolmentCard key={country} date={indiaDateKey(now)} country={country} />
        <Card className="dashboard-card dashboard-card--empty" aria-label="Empty dashboard card" />
        <DateCard date={now} />
      </div>
    </section>
  )
}
