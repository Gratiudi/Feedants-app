import { useState } from 'react'

interface LoginProps {
  onLogin: (token: string) => boolean
  initialMessage?: string
}

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '')

export default function Login({ onLogin, initialMessage = '' }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(initialMessage)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await response.json() as { message?: string; token?: string; user?: { role?: string } }
      if (!response.ok) throw new Error(data.message || 'Sign-in failed. Check your credentials and try again.')
      if (data.user?.role !== 'admin' || !data.token) {
        setError('This account does not have organizer access.')
        return
      }
      if (!onLogin(data.token)) setError('This browser could not save your session. Enable site storage and try again.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to connect to the Feedants service.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-story">
        <div className="brand-lockup login-brand">
          <span className="brand-mark">f</span><span>feedants<span className="brand-product">STUDIO</span></span>
        </div>
        <div className="story-content">
          <span className="story-kicker"><span /> ORGANIZER WORKSPACE</span>
          <h1>Make room for the next great thing.</h1>
          <p>One calm place to bring competitions, participants, and creative work together.</p>
        </div>
        <div className="story-footer"><span>Built for people who make space for talent.</span><span>01 — 03</span></div>
      </div>
      <section className="login-side">
        <form className="login-card" onSubmit={(event) => void handleSubmit(event)}>
          <div className="mobile-login-brand"><span className="brand-mark">f</span><span>feedants studio</span></div>
          <p className="eyebrow">WELCOME BACK</p>
          <h2>Sign in to your workspace</h2>
          <p className="login-description">Use your organizer account to continue.</p>
          {error && <div className="login-error" role="alert">{error}</div>}
          <label className="login-label" htmlFor="admin-email">Email address</label>
          <input
            id="admin-email"
            className="login-input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@organization.com"
            required
          />
          <div className="password-label-row"><label className="login-label" htmlFor="admin-password">Password</label></div>
          <input
            id="admin-password"
            className="login-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? <><span className="button-spinner" />Signing in…</> : <>Sign in <span>→</span></>}
          </button>
          <p className="login-footnote"><span className="secure-dot" />Protected organizer access</p>
        </form>
      </section>
    </main>
  )
}
