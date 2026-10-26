import { useEffect, useRef, useState } from 'react'
import { useNotifications } from '../notifications/Notifications'
import { serverConnected, type Staff } from '../auth/auth'

export default function StatusBar({ staff }: { staff: Staff | null }): React.JSX.Element {
  const [now, setNow] = useState(new Date())
  const [connected, setConnected] = useState<boolean | null>(null)
  const previousConnection = useRef<boolean | null>(null)
  const failedChecks = useRef(0)
  const notify = useNotifications()
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    let active = true
    let checking = false
    const check = (): void => {
      if (checking) return
      checking = true
      serverConnected()
        .then((value) => {
          if (!active) return
          failedChecks.current = value ? 0 : failedChecks.current + 1
          const confirmed = value || failedChecks.current >= 2 ? value : previousConnection.current
          if (confirmed === null) return
          setConnected(confirmed)
          if (previousConnection.current !== confirmed) {
            if (confirmed && previousConnection.current === false) notify.success('Server connected')
            else if (!confirmed) notify.error('Server unavailable')
            previousConnection.current = confirmed
          }
        })
        .catch(() => {
          if (!active) return
          failedChecks.current += 1
          if (failedChecks.current >= 2 && previousConnection.current !== false) {
            setConnected(false)
            notify.error('Server unavailable')
            previousConnection.current = false
          }
        })
        .finally(() => { checking = false })
    }
    check()
    const timer = setInterval(check, 15000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [notify])
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  })
    .format(now)
    .replace(',', '')
    .replaceAll('/', '-')
  return (
    <footer className="statusbar">
      <span>{staff ? staff.full_name || staff.username : 'Not signed in'}</span>
      <time>{time}</time>
      <span className="server">
        <i className={connected === null ? 'pending' : connected ? 'online' : 'offline'} />
        {connected === null
          ? 'Checking server'
          : connected
            ? 'Server connected'
            : 'Server unavailable'}
      </span>
    </footer>
  )
}
