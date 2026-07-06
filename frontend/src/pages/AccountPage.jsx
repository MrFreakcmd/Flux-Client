import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : 'Never'
}

export default function AccountPage() {
  const { user, refreshUser } = useAuth()
  const [profileForm, setProfileForm] = useState({ username: '', avatar: '' })
  const [activity, setActivity] = useState({ ledger: [], audit: [] })
  const [linked, setLinked] = useState([])
  const [apiKeys, setApiKeys] = useState([])
  const [keyName, setKeyName] = useState('Default key')
  const [newSecret, setNewSecret] = useState(null)
  const [message, setMessage] = useState(null)

  async function loadAccount() {
    const [activityData, linkedData, keysData] = await Promise.all([
      apiFetch('/api/account/activity'),
      apiFetch('/api/account/linked-accounts'),
      apiFetch('/api/account/api-keys'),
    ])
    setActivity(activityData)
    setLinked(linkedData.accounts || [])
    setApiKeys(keysData.api_keys || [])
  }

  useEffect(() => {
    setProfileForm({ username: user?.username || '', avatar: user?.avatar || '' })
    loadAccount().catch((err) => setMessage(err.message))
  }, [user?.username, user?.avatar])

  async function updateProfile(event) {
    event.preventDefault()
    setMessage(null)
    try {
      await apiFetch('/api/account/profile', {
        method: 'PATCH',
        body: profileForm,
      })
      await refreshUser()
      setMessage('Profile updated.')
    } catch (err) {
      setMessage(err.message)
    }
  }

  async function createApiKey(event) {
    event.preventDefault()
    setMessage(null)
    try {
      const data = await apiFetch('/api/account/api-keys', {
        method: 'POST',
        body: { name: keyName },
      })
      setNewSecret(data.secret)
      await loadAccount()
      setMessage('API key created. Copy it now; it will not be shown again.')
    } catch (err) {
      setMessage(err.message)
    }
  }

  async function revokeApiKey(id) {
    setMessage(null)
    try {
      await apiFetch(`/api/account/api-keys/${id}`, { method: 'DELETE' })
      await loadAccount()
      setMessage('API key revoked.')
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <div className="stack">
      <section className="dashboard-hero glass-card">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Your identity, security, and activity.</h1>
          <p className="hero-text">Manage your Flux profile, API keys, linked accounts, and account history.</p>
        </div>
        <div className="profile-card">
          {user?.avatar ? <img src={user.avatar} alt="" /> : <div className="avatar-fallback">{user?.username?.[0] || 'F'}</div>}
          <div>
            <strong>{user?.username}</strong>
            <span>{user?.email}</span>
          </div>
        </div>
      </section>

      {message ? <div className="glass-card notice">{message}</div> : null}
      {newSecret ? <div className="code-block">New API key: {newSecret}</div> : null}

      <section className="dashboard-grid">
        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Profile</p>
              <h3>Public details</h3>
            </div>
          </div>
          <form className="form-grid" onSubmit={updateProfile}>
            <label className="field">
              <span>Username</span>
              <input className="input" value={profileForm.username} onChange={(event) => setProfileForm({ ...profileForm, username: event.target.value })} />
            </label>
            <label className="field">
              <span>Avatar URL</span>
              <input className="input" value={profileForm.avatar} onChange={(event) => setProfileForm({ ...profileForm, avatar: event.target.value })} />
            </label>
            <button className="button button-primary" type="submit">Save profile</button>
          </form>
        </article>

        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Linked</p>
              <h3>Connected accounts</h3>
            </div>
          </div>
          <div className="list-stack">
            {linked.map((account) => (
              <div className="list-row" key={account.provider}>
                <div>
                  <strong>{account.provider}</strong>
                  <span>{account.identifier || 'Not linked'}</span>
                </div>
                <span className={`status-chip ${account.connected ? 'online' : 'danger'}`}>{account.connected ? 'Connected' : 'Missing'}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">API</p>
              <h3>Personal access keys</h3>
            </div>
          </div>
          <form className="terminal-input-row" onSubmit={createApiKey}>
            <input className="input terminal-input" value={keyName} onChange={(event) => setKeyName(event.target.value)} />
            <button className="button button-primary" type="submit">Create key</button>
          </form>
          <div className="list-stack spacious">
            {apiKeys.map((apiKey) => (
              <div className="list-row" key={apiKey.id}>
                <div>
                  <strong>{apiKey.name}</strong>
                  <span>{apiKey.prefix} - created {formatDate(apiKey.created_at)} - last used {formatDate(apiKey.last_used_at)}</span>
                </div>
                <button className="button button-ghost" type="button" onClick={() => revokeApiKey(apiKey.id)} disabled={Boolean(apiKey.revoked_at)}>
                  {apiKey.revoked_at ? 'Revoked' : 'Revoke'}
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Security</p>
              <h3>Session status</h3>
            </div>
          </div>
          <div className="stat-grid compact">
            <div className="mini-metric">
              <span>Role</span>
              <strong>{user?.is_admin ? 'Admin' : 'Client'}</strong>
            </div>
            <div className="mini-metric">
              <span>Discord</span>
              <strong>{user?.discord_id}</strong>
            </div>
          </div>
          <p className="muted">Flux currently uses Discord OAuth for login. Password and 2FA pages from MythicalDash are intentionally not copied because this app does not use password authentication.</p>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Ledger</p>
              <h3>Coin activity</h3>
            </div>
          </div>
          <div className="list-stack">
            {activity.ledger.map((entry) => (
              <div className="list-row" key={entry.id}>
                <div>
                  <strong>{entry.description}</strong>
                  <span>{entry.type} - {formatDate(entry.created_at)}</span>
                </div>
                <span className="status-chip neutral">{entry.amount}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Audit</p>
              <h3>Recent actions</h3>
            </div>
          </div>
          <div className="list-stack">
            {activity.audit.map((entry) => (
              <div className="list-row" key={entry.id}>
                <div>
                  <strong>{entry.action}</strong>
                  <span>{formatDate(entry.created_at)} - {entry.ip_address || 'local'}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
