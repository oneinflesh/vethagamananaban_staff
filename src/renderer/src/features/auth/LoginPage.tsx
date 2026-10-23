import { useState } from 'react'
import { login, type Staff } from './auth'
import { Button, Field, Input } from '@fluentui/react-components'
import { toast } from 'react-toastify'

export default function LoginPage({ onLogin }: { onLogin: (staff: Staff) => void }): React.JSX.Element {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault(); setBusy(true); setError('')
    try { onLogin(await login(identifier.trim(), password)); toast.success('Signed in') }
    catch (cause) { const message = cause instanceof Error ? cause.message : 'Login failed'; setError(message); toast.error(message) }
    finally { setBusy(false) }
  }
  return <main className="login-page"><form className="login-card" onSubmit={submit}>
    <h1>Office sign in</h1><p>Use your existing staff credentials.</p>
    <Field label="Username or email" required><Input autoFocus required value={identifier} onChange={(_, data) => setIdentifier(data.value)} /></Field>
    <Field label="Password" required><Input type="password" required value={password} onChange={(_, data) => setPassword(data.value)} /></Field>
    {error && <p className="error" role="alert">{error}</p>}
    <Button appearance="primary" type="submit" disabled={busy}>{busy ? 'Connecting…' : 'Sign in'}</Button>
  </form></main>
}
