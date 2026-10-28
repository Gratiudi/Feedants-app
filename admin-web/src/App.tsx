import { useCallback, useEffect, useMemo, useState } from 'react'
import Login from './components/Login'
import './App.css'

type ViewKey = 'Overview' | 'Competitions' | 'Participants' | 'Entries' | 'Results'
type Person = { _id: string; name: string; email: string; phone?: string; role?: string }
type Competition = {
  _id: string
  title: string
  description?: string
  prizePool: number
  entryFee: number
  totalSpots: number
  spotsBooked: number
  registerBefore: string
  submissionStart: string
  submissionEnd: string
  resultDate: string
  tags?: string[]
  judgeId?: string | { name?: string }
}
type Judge = { _id: string; name: string }
type Registration = {
  _id: string
  paymentStatus: string
  registeredAt: string
  userId?: Person
  competitionId?: Competition
}
type Submission = {
  _id: string
  submittedAt: string
  fileUrl: string
  userId?: Person
  competitionId?: Competition
}
type Result = {
  _id: string
  announcedAt: string
  competitionId?: Competition
  winners: Array<{ userId?: Person; position: number; prizeAwarded: number }>
}
type DashboardData = {
  competitions: Competition[]
  judges: Judge[]
  users: Person[]
  registrations: Registration[]
  submissions: Submission[]
  results: Result[]
}

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '')
const navItems: Array<{ label: ViewKey; icon: string; description: string }> = [
  { label: 'Overview', icon: '⌂', description: 'Today at a glance' },
  { label: 'Competitions', icon: '✳', description: 'Open calls and dates' },
  { label: 'Participants', icon: '◉', description: 'Registered accounts' },
  { label: 'Entries', icon: '↗', description: 'Registrations and work' },
  { label: 'Results', icon: '☆', description: 'Published outcomes' },
]

async function request<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = await response.json() as { message?: string }
      if (body.message) message = body.message
    } catch {
      // Keep the HTTP status as the visible error when the server has no JSON body.
    }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

async function fetchDashboardData(token: string): Promise<DashboardData> {
  const [competitions, judges, users, registrations, submissions, results] = await Promise.all([
    request<Competition[]>('/api/competitions', token),
    request<Judge[]>('/api/judges', token),
    request<Person[]>('/api/users', token),
    request<Registration[]>('/api/registrations', token),
    request<Submission[]>('/api/submissions', token),
    request<Result[]>('/api/results', token),
  ])
  return { competitions, judges, users, registrations, submissions, results }
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to load dashboard data.'
}

function readToken() {
  try {
    return localStorage.getItem('feedants-admin-token')
  } catch {
    return null
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value || 0)
}

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function statusForCompetition(competition: Competition) {
  const now = Date.now()
  if (new Date(competition.registerBefore).getTime() < now) return 'Closed'
  if (competition.spotsBooked >= competition.totalSpots) return 'Full'
  return 'Open'
}

function App() {
  const [token, setToken] = useState<string | null>(readToken)
  const [activeView, setActiveView] = useState<ViewKey>('Overview')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(() => Boolean(readToken()))
  const [error, setError] = useState('')
  const [loginMessage, setLoginMessage] = useState('')
  const [search, setSearch] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  const logout = useCallback((message = '') => {
    let cleanupMessage = ''
    try {
      localStorage.removeItem('feedants-admin-token')
    } catch {
      cleanupMessage = 'Could not clear the saved session from this browser.'
    }
    setToken(null)
    setData(null)
    setError('')
    setLoginMessage(cleanupMessage || message)
  }, [])

  const loadData = useCallback(async (currentToken: string) => {
    setLoading(true)
    setError('')
    try {
      setData(await fetchDashboardData(currentToken))
    } catch (loadError) {
      const message = messageFrom(loadError)
      if (message.includes('(401)') || message.includes('(403)') || /invalid|expired|admin access|required/i.test(message)) {
        logout('Your admin session expired. Please sign in again.')
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }, [logout])

  useEffect(() => {
    if (!token) return
    let active = true
    fetchDashboardData(token)
      .then((dashboard) => { if (active) setData(dashboard) })
      .catch((loadError: unknown) => {
        if (!active) return
        const message = messageFrom(loadError)
        if (message.includes('(401)') || message.includes('(403)') || /invalid|expired|admin access|required/i.test(message)) {
          logout('Your admin session expired. Please sign in again.')
        } else {
          setError(message)
        }
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, logout])

  const filteredCompetitions = useMemo(() => {
    if (!data) return []
    const query = search.trim().toLowerCase()
    return data.competitions.filter((competition) =>
      `${competition.title} ${(competition.tags ?? []).join(' ')}`.toLowerCase().includes(query),
    )
  }, [data, search])

  const handleLogin = (newToken: string) => {
    try {
      localStorage.setItem('feedants-admin-token', newToken)
    } catch {
      setLoginMessage('This browser cannot store a session. Enable site storage and try again.')
      return false
    }
    setLoginMessage('')
    setError('')
    setLoading(true)
    setToken(newToken)
    return true
  }

  const handleCompetitionCreated = async () => {
    setShowCreateForm(false)
    if (token) await loadData(token)
  }

  if (!token) return <Login onLogin={handleLogin} initialMessage={loginMessage} />

  const stats = data ? [
    { label: 'Open competitions', value: formatNumber(data.competitions.filter((item) => statusForCompetition(item) === 'Open').length), note: 'Accepting entries', icon: '✳' },
    { label: 'Participants', value: formatNumber(data.users.length), note: 'Accounts on Feedants', icon: '◉' },
    { label: 'Registrations', value: formatNumber(data.registrations.length), note: 'Includes demo entries', icon: '↗' },
    { label: 'Submissions', value: formatNumber(data.submissions.length), note: 'Uploaded performances', icon: '▤' },
  ] : []

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <a className="brand-lockup" href="#" onClick={(event) => { event.preventDefault(); setActiveView('Overview') }}>
          <span className="brand-mark">f</span>
          <span>feedants<span className="brand-product">STUDIO</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Dashboard sections">
          {navItems.map((item) => (
            <button key={item.label} className={`nav-item ${activeView === item.label ? 'nav-item-active' : ''}`} onClick={() => { setActiveView(item.label); setSearch('') }}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-copy"><span>{item.label}</span><small>{item.description}</small></span>
              {activeView === item.label && <span className="nav-active-mark" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="logout-button" onClick={() => logout()}><span>↪</span> Sign out</button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div><span className="breadcrumb">Feedants Studio</span><span className="breadcrumb-separator">/</span><strong>{activeView}</strong></div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Refresh dashboard" onClick={() => token && void loadData(token)} disabled={loading}>↻</button>
            <div className="profile-chip"><span className="profile-avatar">A</span><span>Administrator</span></div>
          </div>
        </header>

        <div className="page-content">
          <div className="page-title-row">
            <div><p className="eyebrow">{activeView === 'Overview' ? 'YOUR PLATFORM, AT A GLANCE' : 'FEEDANTS STUDIO'}</p><h1>{activeView === 'Overview' ? 'Good to see you.' : activeView}</h1><p className="page-subtitle">{pageSubtitle(activeView)}</p></div>
            {activeView === 'Competitions' && <button className="primary-button" onClick={() => setShowCreateForm(true)}><span>＋</span> New competition</button>}
          </div>

          {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={() => token && void loadData(token)}>Try again</button></div>}
          {loading && !data ? <div className="loading-panel"><span className="spinner" />Loading your workspace…</div> : data ? (
            <>
              {activeView === 'Overview' && <Overview data={data} stats={stats} onOpenCompetitions={() => setActiveView('Competitions')} />}
              {activeView === 'Competitions' && (
                <CompetitionList competitions={filteredCompetitions} search={search} setSearch={setSearch} loading={loading} onRefresh={() => token && void loadData(token)} />
              )}
              {activeView === 'Participants' && <Participants users={data.users} search={search} setSearch={setSearch} />}
              {activeView === 'Entries' && <Entries registrations={data.registrations} submissions={data.submissions} search={search} setSearch={setSearch} />}
              {activeView === 'Results' && <Results results={data.results} />}
            </>
          ) : <div className="loading-panel">Your workspace data is not available. Refresh to try again.</div>}
          <footer className="page-footer"><span>Feedants Studio</span><span>Competition operations</span></footer>
        </div>
      </main>

      {showCreateForm && token && data && (
        <CompetitionForm
          judges={data.judges}
          token={token}
          onClose={() => setShowCreateForm(false)}
          onCreated={() => void handleCompetitionCreated()}
        />
      )}
    </div>
  )
}

function pageSubtitle(view: ViewKey) {
  const descriptions: Record<ViewKey, string> = {
    Overview: 'A clear view of your competitions and community.',
    Competitions: 'Create and monitor opportunities for performers.',
    Participants: 'People who have created a Feedants account.',
    Entries: 'Registration and submission records from the platform.',
    Results: 'Competition outcomes published by organizers.',
  }
  return descriptions[view]
}

function Overview({ data, stats, onOpenCompetitions }: { data: DashboardData; stats: Array<{ label: string; value: string; note: string; icon: string }>; onOpenCompetitions: () => void }) {
  const recent = [...data.competitions].sort((a, b) => new Date(b.registerBefore).getTime() - new Date(a.registerBefore).getTime()).slice(0, 4)
  return (
    <>
      <section className="stats-grid">
        {stats.map((stat, index) => <article className={`stat-card stat-card-${index + 1}`} key={stat.label}><div className="stat-top"><span>{stat.label}</span><span className="stat-icon">{stat.icon}</span></div><strong>{stat.value}</strong><small>{stat.note}</small></article>)}
      </section>
      <section className="overview-grid">
        <article className="panel competitions-panel">
          <div className="panel-heading"><div><p className="eyebrow">KEEP AN EYE ON</p><h2>Competition calendar</h2></div><button className="text-button" onClick={onOpenCompetitions}>All competitions ↗</button></div>
          {recent.length ? <div className="competition-list">{recent.map((item) => <div className="competition-list-item" key={item._id}><span className="competition-avatar">{item.title.slice(0, 1)}</span><div className="competition-list-copy"><strong>{item.title}</strong><small>{formatDate(item.registerBefore)} · {formatNumber(item.spotsBooked)} / {formatNumber(item.totalSpots)} spots</small></div><span className={`status-badge status-${statusForCompetition(item).toLowerCase()}`}>{statusForCompetition(item)}</span></div>)}</div> : <EmptyState title="No competitions yet" message="Create a competition to start building your calendar." />}
        </article>
        <aside className="panel preview-panel">
          <div className="preview-orbit"><span>f</span></div><p className="eyebrow">BUILT FOR TALENT</p><h2>Great work deserves a stage.</h2><p>Feedants brings performers, organizers, and judges together in one place.</p>
          <div className="preview-panel-meta"><span className="live-dot" />Competitions · registrations · submissions</div>
        </aside>
      </section>
    </>
  )
}

function CompetitionList({ competitions, search, setSearch, loading, onRefresh }: { competitions: Competition[]; search: string; setSearch: (value: string) => void; loading: boolean; onRefresh: () => void }) {
  return (
    <section className="panel table-panel">
      <div className="table-toolbar"><div><p className="eyebrow">OPPORTUNITIES</p><h2>All competitions <span className="count-pill">{competitions.length}</span></h2></div><div className="toolbar-actions"><label className="search-field"><span>⌕</span><input aria-label="Search competitions" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search competitions" /></label><button className="subtle-button" onClick={onRefresh} disabled={loading}>↻ Refresh</button></div></div>
      <div className="table-scroll"><table><thead><tr><th>COMPETITION</th><th>STATUS</th><th>ENTRY FEE</th><th>PRIZE POOL</th><th>SPOTS</th><th>REGISTRATION CLOSES</th></tr></thead><tbody>
        {competitions.map((item) => <tr key={item._id}><td><div className="table-primary"><span className="table-avatar">{item.title.slice(0, 1)}</span><span><strong>{item.title}</strong><small>{(item.tags ?? []).slice(0, 3).join(' · ') || 'No categories'}</small></span></div></td><td><span className={`status-badge status-${statusForCompetition(item).toLowerCase()}`}>{statusForCompetition(item)}</span></td><td>{formatNumber(item.entryFee)} ETB</td><td className="strong-cell">{formatNumber(item.prizePool)} ETB</td><td>{formatNumber(item.spotsBooked)} / {formatNumber(item.totalSpots)}</td><td>{formatDate(item.registerBefore)}</td></tr>)}
      </tbody></table></div>
      {!competitions.length && <EmptyState title="No competitions found" message={search ? 'Try a different search term.' : 'Create your first competition to get started.'} />}
      <div className="table-footnote">Competition editing and deletion are not enabled in this preview.</div>
    </section>
  )
}

function Participants({ users, search, setSearch }: { users: Person[]; search: string; setSearch: (value: string) => void }) {
  const visible = users.filter((user) => `${user.name} ${user.email} ${user.phone ?? ''}`.toLowerCase().includes(search.toLowerCase()))
  return (
    <section className="panel table-panel">
      <div className="table-toolbar"><div><p className="eyebrow">COMMUNITY</p><h2>Participant accounts <span className="count-pill">{visible.length}</span></h2></div><label className="search-field"><span>⌕</span><input aria-label="Search participants" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people" /></label></div>
      <div className="table-scroll"><table><thead><tr><th>PARTICIPANT</th><th>EMAIL</th><th>PHONE</th><th>ACCOUNT TYPE</th></tr></thead><tbody>{visible.map((user) => <tr key={user._id}><td><div className="table-primary"><span className="person-avatar">{user.name.slice(0, 1).toUpperCase()}</span><strong>{user.name}</strong></div></td><td>{user.email}</td><td>{user.phone || '—'}</td><td><span className="status-badge status-neutral">{user.role === 'admin' ? 'Organizer' : 'Participant'}</span></td></tr>)}</tbody></table></div>
      {!visible.length && <EmptyState title={search ? 'No matching accounts' : 'No participant accounts yet'} message={search ? 'Try another name or email.' : 'Newly registered accounts will appear here.'} />}
    </section>
  )
}

function Entries({ registrations, submissions, search, setSearch }: { registrations: Registration[]; submissions: Submission[]; search: string; setSearch: (value: string) => void }) {
  const query = search.toLowerCase()
  const filteredRegistrations = registrations.filter((item) => `${item.userId?.name ?? ''} ${item.userId?.email ?? ''} ${item.competitionId?.title ?? ''}`.toLowerCase().includes(query))
  const filteredSubmissions = submissions.filter((item) => `${item.userId?.name ?? ''} ${item.competitionId?.title ?? ''}`.toLowerCase().includes(query))
  return (
    <div className="entries-stack">
      <section className="panel table-panel"><div className="table-toolbar"><div><p className="eyebrow">PARTICIPATION</p><h2>Registrations <span className="count-pill">{filteredRegistrations.length}</span></h2></div><label className="search-field"><span>⌕</span><input aria-label="Search entries" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search entries" /></label></div>
        <div className="table-scroll"><table><thead><tr><th>PARTICIPANT</th><th>COMPETITION</th><th>PAYMENT</th><th>REGISTERED</th></tr></thead><tbody>{filteredRegistrations.map((item) => <tr key={item._id}><td>{item.userId?.name || 'Unknown participant'}</td><td>{item.competitionId?.title || 'Unknown competition'}</td><td><span className={`status-badge status-${item.paymentStatus === 'paid' ? 'open' : 'neutral'}`}>{item.paymentStatus === 'demo' ? 'Demo · unpaid' : item.paymentStatus}</span></td><td>{formatDate(item.registeredAt)}</td></tr>)}</tbody></table></div>
        {!filteredRegistrations.length && <EmptyState title="No registrations yet" message="Participant registrations will appear here." />}
      </section>
      <section className="panel table-panel"><div className="table-toolbar"><div><p className="eyebrow">PERFORMANCE WORK</p><h2>Submissions <span className="count-pill">{filteredSubmissions.length}</span></h2></div></div>
        <div className="table-scroll"><table><thead><tr><th>PARTICIPANT</th><th>COMPETITION</th><th>SUBMITTED</th><th>MEDIA</th></tr></thead><tbody>{filteredSubmissions.map((item) => <tr key={item._id}><td>{item.userId?.name || 'Unknown participant'}</td><td>{item.competitionId?.title || 'Unknown competition'}</td><td>{formatDate(item.submittedAt)}</td><td><a className="media-link" href={item.fileUrl} target="_blank" rel="noreferrer">Open media ↗</a></td></tr>)}</tbody></table></div>
        {!filteredSubmissions.length && <EmptyState title="No submissions yet" message="Demo participants can upload a performance during the submission window." />}
      </section>
    </div>
  )
}

function Results({ results }: { results: Result[] }) {
  return (
    <section className="panel table-panel"><div className="table-toolbar"><div><p className="eyebrow">OUTCOMES</p><h2>Published results <span className="count-pill">{results.length}</span></h2></div></div>
      <div className="table-scroll"><table><thead><tr><th>COMPETITION</th><th>WINNERS</th><th>ANNOUNCED</th></tr></thead><tbody>{results.map((result) => <tr key={result._id}><td className="strong-cell">{result.competitionId?.title || 'Competition'}</td><td>{result.winners?.map((winner) => `${winner.position}. ${winner.userId?.name || 'Participant'}`).join(' · ') || '—'}</td><td>{formatDate(result.announcedAt)}</td></tr>)}</tbody></table></div>
      {!results.length && <EmptyState title="No published results yet" message="Results appear here when an organizer publishes an outcome." />}
      <div className="table-footnote">Publishing results is not available in this preview.</div>
    </section>
  )
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className="empty-state"><span className="empty-icon">✳</span><h3>{title}</h3><p>{message}</p></div>
}

function CompetitionForm({ judges, token, onClose, onCreated }: { judges: Judge[]; token: string; onClose: () => void; onCreated: () => void }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', tags: '', judgeId: '', entryFee: '', prizePool: '', totalSpots: '',
    registerBefore: '', submissionStart: '', submissionEnd: '', resultDate: '',
    judgingParameters: '', rulesAndEligibility: '', refundPolicy: '',
    firstPrize: '', secondPrize: '', thirdPrize: '',
  })
  const setField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }))

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const registerBefore = new Date(form.registerBefore)
    const submissionStart = new Date(form.submissionStart)
    const submissionEnd = new Date(form.submissionEnd)
    const resultDate = new Date(form.resultDate)
    if (!(registerBefore < submissionEnd && submissionStart <= submissionEnd && resultDate >= submissionEnd)) {
      setError('Check the schedule: registration and submission deadlines must be in order, and results cannot precede the submission deadline.')
      return
    }
    const rewards = [form.firstPrize, form.secondPrize, form.thirdPrize]
      .map((amount, index) => ({ position: index + 1, amount: Number(amount) }))
      .filter((reward) => reward.amount > 0)
    setSubmitting(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        ...(form.judgeId ? { judgeId: form.judgeId } : {}),
        prizePool: Number(form.prizePool),
        entryFee: Number(form.entryFee),
        totalSpots: Number(form.totalSpots),
        registerBefore: registerBefore.toISOString(),
        submissionStart: submissionStart.toISOString(),
        submissionEnd: submissionEnd.toISOString(),
        resultDate: resultDate.toISOString(),
        rewards,
        judgingParameters: form.judgingParameters.trim(),
        rulesAndEligibility: form.rulesAndEligibility.trim(),
        refundPolicy: form.refundPolicy.trim(),
      }
      const response = await fetch(`${API_URL}/api/competitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        let message = 'Could not create this competition.'
        try {
          const body = await response.json() as { message?: string }
          if (body.message) message = body.message
        } catch {
          // Use the form's generic error for non-JSON responses.
        }
        throw new Error(message)
      }
      onCreated()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not create this competition.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose() }}>
      <section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="create-title">
        <div className="modal-heading"><div><p className="eyebrow">NEW OPPORTUNITY</p><h2 id="create-title">Create a competition</h2></div><button className="modal-close" onClick={onClose} aria-label="Close form">×</button></div>
        <p className="modal-intro">Set up a public competition listing. Participants can register directly; no entry fees are collected.</p>
        <form onSubmit={(event) => void submit(event)}>
          <div className="form-grid">
            <label className="form-field form-full">Competition name<input required maxLength={120} value={form.title} onChange={(event) => setField('title', event.target.value)} placeholder="e.g. Addis Acoustic Sessions" /></label>
            <label className="form-field form-full">Description<textarea rows={3} value={form.description} onChange={(event) => setField('description', event.target.value)} placeholder="Tell performers what makes this opportunity special." /></label>
            <label className="form-field">Categories<input value={form.tags} onChange={(event) => setField('tags', event.target.value)} placeholder="Music, Acoustic" /></label>
            <label className="form-field">Judge<select value={form.judgeId} onChange={(event) => setField('judgeId', event.target.value)}><option value="">Not assigned</option>{judges.map((judge) => <option value={judge._id} key={judge._id}>{judge.name}</option>)}</select></label>
            <label className="form-field">Entry fee (ETB)<input type="number" min="0" step="1" required value={form.entryFee} onChange={(event) => setField('entryFee', event.target.value)} /></label>
            <label className="form-field">Prize pool (ETB)<input type="number" min="0" step="1" required value={form.prizePool} onChange={(event) => setField('prizePool', event.target.value)} /></label>
            <label className="form-field">Total spots<input type="number" min="1" step="1" required value={form.totalSpots} onChange={(event) => setField('totalSpots', event.target.value)} /></label>
            <label className="form-field">Registration deadline<input type="datetime-local" required value={form.registerBefore} onChange={(event) => setField('registerBefore', event.target.value)} /></label>
            <label className="form-field">Submissions open<input type="datetime-local" required value={form.submissionStart} onChange={(event) => setField('submissionStart', event.target.value)} /></label>
            <label className="form-field">Submission deadline<input type="datetime-local" required value={form.submissionEnd} onChange={(event) => setField('submissionEnd', event.target.value)} /></label>
            <label className="form-field">Results date<input type="datetime-local" required value={form.resultDate} onChange={(event) => setField('resultDate', event.target.value)} /></label>
            <label className="form-field">1st prize (ETB)<input type="number" min="0" step="1" value={form.firstPrize} onChange={(event) => setField('firstPrize', event.target.value)} /></label>
            <label className="form-field">2nd prize (ETB)<input type="number" min="0" step="1" value={form.secondPrize} onChange={(event) => setField('secondPrize', event.target.value)} /></label>
            <label className="form-field">3rd prize (ETB)<input type="number" min="0" step="1" value={form.thirdPrize} onChange={(event) => setField('thirdPrize', event.target.value)} /></label>
            <label className="form-field form-full">Judging criteria<textarea rows={2} value={form.judgingParameters} onChange={(event) => setField('judgingParameters', event.target.value)} /></label>
            <label className="form-field form-full">Eligibility and rules<textarea rows={2} value={form.rulesAndEligibility} onChange={(event) => setField('rulesAndEligibility', event.target.value)} /></label>
            <label className="form-field form-full">Refund policy<textarea rows={2} value={form.refundPolicy} onChange={(event) => setField('refundPolicy', event.target.value)} /></label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions"><button type="button" className="subtle-button" onClick={onClose} disabled={submitting}>Cancel</button><button type="submit" className="primary-button" disabled={submitting}>{submitting ? 'Creating…' : 'Create competition'}</button></div>
        </form>
      </section>
    </div>
  )
}

export default App
