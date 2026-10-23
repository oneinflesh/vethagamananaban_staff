import { CalendarDays } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function DateCard({ date }: { date: Date }): React.JSX.Element {
  const dateParts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).formatToParts(date)
  const part = (type: string): string => dateParts.find((item) => item.type === type)?.value ?? ''

  return (
    <Card className="dashboard-card dashboard-card--date">
      <div className="dashboard-card__top">
        <span className="dashboard-card__icon">
          <CalendarDays size={22} />
        </span>
        <span className="dashboard-card__eyebrow">INDIA</span>
      </div>
      <div className="dashboard-date">
        <span className="dashboard-date__day">{part('day')}</span>
        <span className="dashboard-date__details">
          <strong>{part('weekday')}</strong>
          <span>
            {part('month')} {part('year')}
          </span>
        </span>
      </div>
    </Card>
  )
}
