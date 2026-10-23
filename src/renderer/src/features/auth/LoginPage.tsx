import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNotifications } from '../notifications/Notifications'
import Aurora from '../visuals/Aurora'
import FullScreenLoader from './FullScreenLoader'
import { login, type Staff } from './auth'

export default function LoginPage({
  onLogin
}: {
  onLogin: (staff: Staff) => void
}): React.JSX.Element {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const notify = useNotifications()

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    setBusy(true)
    try {
      onLogin(await login(identifier.trim(), password))
      notify.success('Signed in')
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-aurora" aria-hidden="true">
        <Aurora
          colorStops={['#5b6ee1', '#8b5cf6', '#2f80ed']}
          lightMode
          mouseInteraction={false}
          speed={0.35}
          amplitude={0.5}
          glow={0.35}
          paused={busy}
        />
      </div>
      <Card className="login-card">
        <CardHeader>
          <CardTitle className="login-greeting" lang="ta">
            வணக்கம் வேதாகம நண்பன்
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={submit}>
            <div className="grid gap-2">
              <Label htmlFor="identifier">Username or email</Label>
              <Input
                id="identifier"
                autoFocus
                required
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? 'Connecting…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
      {busy && <FullScreenLoader />}
    </main>
  )
}
