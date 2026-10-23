import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNotifications } from '../notifications/Notifications'
import OrangeBackground from '../visuals/OrangeBackground'
import FullScreenLoader from '../shell/FullScreenLoader'
import { login, type AuthSession } from './auth'

export default function LoginPage({
  onLogin
}: {
  onLogin: (session: AuthSession) => void
}): React.JSX.Element {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [busy, setBusy] = useState(false)
  const [completed, setCompleted] = useState(false)
  const notify = useNotifications()

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    setBusy(true)
    setCompleted(false)
    try {
      const session = await login(username.trim(), password, remember)
      setCompleted(true)
      await new Promise((resolve) => window.setTimeout(resolve, 300))
      onLogin(session)
      notify.success('Signed in')
    } catch (cause) {
      setCompleted(true)
      await new Promise((resolve) => window.setTimeout(resolve, 300))
      notify.error(cause instanceof Error ? cause.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <OrangeBackground />
      <Card className="login-card">
        <CardHeader>
          <CardTitle className="login-greeting" lang="ta">
            வணக்கம் வேதாகம நண்பன்
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={submit}>
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoFocus
                required
                autoComplete="username"
                pattern="[^@\s]+"
                title="Enter your username, not an email address"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <label className="login-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              Remember me for 24 hours
            </label>
            <Button type="submit" disabled={busy}>
              {busy ? 'Connecting…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
      {busy && <FullScreenLoader message="Signing you in" complete={completed} />}
    </main>
  )
}
