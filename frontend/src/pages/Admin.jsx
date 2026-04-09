import { useState, useEffect, useCallback } from 'react'
import '../App.css'

const TOKEN_KEY = 'yse_admin_token'

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [stats, setStats] = useState(null)
  const [sessions, setSessions] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [statsError, setStatsError] = useState('')
  const [sessionsError, setSessionsError] = useState('')
  const LIMIT = 20

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const fetchStats = useCallback(async () => {
    setStatsError('')
    try {
      const res = await fetch('/api/admin/stats', { headers: authHeaders })
      if (!res.ok) {
        const msg = res.status === 503 ? 'MongoDB not connected.' : res.status === 401 ? 'Unauthorized.' : 'Failed to load stats.'
        setStatsError(msg)
        return
      }
      setStats(await res.json())
    } catch {
      setStatsError('Failed to load stats.')
    }
  }, [token])

  const fetchSessions = useCallback(async (p = 1) => {
    setLoading(true)
    setSessionsError('')
    try {
      const res = await fetch(`/api/admin/sessions?page=${p}&limit=${LIMIT}`, { headers: authHeaders })
      if (!res.ok) {
        const msg = res.status === 503 ? 'MongoDB not connected.' : res.status === 401 ? 'Unauthorized.' : 'Failed to load sessions.'
        setSessionsError(msg)
        return
      }
      const data = await res.json()
      setSessions(data.sessions || [])
      setTotal(data.total || 0)
    } catch {
      setSessionsError('Failed to load sessions.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    fetchStats()
    fetchSessions(page)
  }, [token])

  const login = async (e) => {
    e.preventDefault()
    setLoginError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) { setLoginError('Wrong password.'); return }
      const data = await res.json()
      sessionStorage.setItem(TOKEN_KEY, data.token)
      setToken(data.token)
    } catch {
      setLoginError('Login failed. Try again.')
    }
  }

  const logout = () => {
    sessionStorage.removeItem(TOKEN_KEY)
    setToken('')
    setStats(null)
    setSessions([])
    setStatsError('')
    setSessionsError('')
  }

  const goPage = (p) => {
    setPage(p)
    fetchSessions(p)
  }

  const formatDate = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString()
  }

  const totalPages = Math.ceil(total / LIMIT)

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="admin-login-wrap">
        <div className="admin-login-card">
          <div className="admin-login-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#19c37d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="admin-login-title">Admin Dashboard</h1>
          <p className="admin-login-sub">yoursurvivalexpert.ai</p>
          <form onSubmit={login} className="admin-login-form">
            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="admin-login-input"
              autoFocus
            />
            <button type="submit" className="admin-login-btn">Sign In</button>
          </form>
          {loginError && <p className="admin-login-error">{loginError}</p>}
        </div>
      </div>
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div className="admin-wrap">
      <header className="admin-header">
        <div className="admin-header-left">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#19c37d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="admin-header-title">Admin Dashboard</span>
          <span className="admin-header-sub">yoursurvivalexpert.ai</span>
        </div>
        <div style={{display:'flex',gap:'0.5rem'}}>
          <button className="admin-refresh-btn" onClick={() => { fetchStats(); fetchSessions(page) }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Refresh
          </button>
          <button className="admin-logout-btn" onClick={logout}>Sign out</button>
        </div>
      </header>

      {/* Stats cards */}
      {statsError && <p className="admin-error">{statsError}</p>}
      {stats && (
        <>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <p className="admin-stat-label">Total Sessions</p>
              <p className="admin-stat-value">{stats.total_sessions.toLocaleString()}</p>
            </div>
            <div className="admin-stat-card accent">
              <p className="admin-stat-label">Emails Collected</p>
              <p className="admin-stat-value">{stats.total_emails.toLocaleString()}</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Guides Sent</p>
              <p className="admin-stat-value">{stats.total_guides_sent.toLocaleString()}</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Exit Intent Leads</p>
              <p className="admin-stat-value">{stats.total_exit_leads.toLocaleString()}</p>
            </div>
            <div className="admin-stat-card accent">
              <p className="admin-stat-label">Conversion Rate</p>
              <p className="admin-stat-value">{stats.conversion_rate}%</p>
            </div>
          </div>

          {/* Top regions + concerns */}
          <div className="admin-two-col">
            <div className="admin-panel">
              <h3 className="admin-panel-title">Top Regions</h3>
              {stats.top_regions.map((r) => (
                <div key={r.region} className="admin-bar-row">
                  <span className="admin-bar-label">{r.region}</span>
                  <div className="admin-bar-track">
                    <div
                      className="admin-bar-fill"
                      style={{ width: `${Math.round((r.count / (stats.top_regions[0]?.count || 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="admin-bar-count">{r.count}</span>
                </div>
              ))}
            </div>
            <div className="admin-panel">
              <h3 className="admin-panel-title">Top Concerns</h3>
              {stats.top_concerns.map((c) => (
                <div key={c.concern} className="admin-bar-row">
                  <span className="admin-bar-label">{c.concern}</span>
                  <div className="admin-bar-track">
                    <div
                      className="admin-bar-fill"
                      style={{ width: `${Math.round((c.count / (stats.top_concerns[0]?.count || 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="admin-bar-count">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {sessionsError && <p className="admin-error">{sessionsError}</p>}
      {/* Sessions table */}
      <div className="admin-panel admin-table-panel">
        <div className="admin-panel-header">
          <h3 className="admin-panel-title">Recent Sessions</h3>
          <span className="admin-total-badge">{total.toLocaleString()} total</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Email</th>
                <th>Region</th>
                <th>Concern</th>
                <th>Preparing For</th>
                <th>Guide</th>
                <th>Source</th>
                <th>Messages</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="admin-table-empty">Loading…</td></tr>
              ) : sessions.length === 0 ? (
                <tr><td colSpan="9" className="admin-table-empty">No sessions yet.</td></tr>
              ) : sessions.map((s) => (
                <tr key={s._id}>
                  <td className="admin-td-date">{formatDate(s.created_at)}</td>
                  <td className="admin-td-email">{s.email || <span className="admin-empty">—</span>}</td>
                  <td>{s.profile?.region || <span className="admin-empty">—</span>}</td>
                  <td>{s.profile?.concern || <span className="admin-empty">—</span>}</td>
                  <td>{s.profile?.preparingFor || <span className="admin-empty">—</span>}</td>
                  <td>
                    {s.guide_sent_at
                      ? <span className="admin-badge sent">Sent</span>
                      : <span className="admin-badge pending">—</span>}
                  </td>
                  <td>{s.lead_source || <span className="admin-empty">chat</span>}</td>
                  <td>{s.message_count ?? '—'}</td>
                  <td className="admin-td-ip">{s.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="admin-pagination">
            <button
              className="admin-page-btn"
              disabled={page === 1}
              onClick={() => goPage(page - 1)}
            >← Prev</button>
            <span className="admin-page-info">Page {page} of {totalPages}</span>
            <button
              className="admin-page-btn"
              disabled={page === totalPages}
              onClick={() => goPage(page + 1)}
            >Next →</button>
          </div>
        )}
      </div>
    </div>
  )
}
