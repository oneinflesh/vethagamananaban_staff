import { useState } from 'react'
import { login, type Staff } from './auth'

export default function LoginPage({ onLogin }: { onLogin: (staff: Staff) => void }): React.JSX.Element {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault(); setBusy(true); setError('')
    try { onLogin(await login(identifier.trim(), password)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Login failed') }
    finally { setBusy(false) }
  }
  return <main className="login-page"><form className="login-card" onSubmit={submit}>
    <h1>Office sign in</h1><p>Use your existing staff credentials.</p>
    <label>Username or email<input autoFocus required value={identifier} onChange={event => setIdentifier(event.target.value)} /></label>
    <label>Password<input type="password" required value={password} onChange={event => setPassword(event.target.value)} /></label>
    {error && <p className="error" role="alert">{error}</p>}
    <button disabled={busy}>{busy ? 'Connecting…' : 'Sign in'}</button>
  </form></main>
}
