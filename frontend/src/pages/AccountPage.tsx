import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'
import { Card, Badge, Button, Input } from '../components'
import { staggerContainerVariants, staggerItemVariants } from '../hooks'

interface ApiKey {
  id: string
  name: string
  prefix: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

interface LinkedAccount {
  provider: string
  identifier: string | null
  connected: boolean
}

interface CoinLedgerEntry {
  id: number
  description: string
  type: string
  amount: string
  created_at: string
}

interface AuditEntry {
  id: number
  action: string
  created_at: string
  ip_address: string | null
}

interface ActivityData {
  ledger: CoinLedgerEntry[]
  audit: AuditEntry[]
}

interface ProfileFormData {
  username: string
  avatar: string
}

function formatDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString() : 'Never'
}

export default function AccountPage() {
  const { user, refreshUser } = useAuth()
  const [profileForm, setProfileForm] = useState<ProfileFormData>({ username: '', avatar: '' })
  const [activity, setActivity] = useState<ActivityData>({ ledger: [], audit: [] })
  const [linked, setLinked] = useState<LinkedAccount[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [keyName, setKeyName] = useState<string>('Default key')
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  async function loadAccount(): Promise<void> {
    try {
      const [activityData, linkedData, keysData] = await Promise.all([
        apiFetch<ActivityData>('/api/account/activity'),
        apiFetch<{ accounts: LinkedAccount[] }>('/api/account/linked-accounts'),
        apiFetch<{ api_keys: ApiKey[] }>('/api/account/api-keys'),
      ])
      setActivity(activityData)
      setLinked(linkedData.accounts || [])
      setApiKeys(keysData.api_keys || [])
    } catch (err) {
      setMessageType('error')
      setMessage(err instanceof Error ? err.message : 'Failed to load account data')
    }
  }

  useEffect(() => {
    setProfileForm({ username: user?.username || '', avatar: user?.avatar || '' })
    loadAccount()
  }, [user?.username, user?.avatar])

  async function updateProfile(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setMessage(null)
    try {
      await apiFetch('/api/account/profile', {
        method: 'PATCH',
        body: profileForm,
      })
      await refreshUser()
      setMessageType('success')
      setMessage('Profile updated.')
    } catch (err) {
      setMessageType('error')
      setMessage(err instanceof Error ? err.message : 'Failed to update profile')
    }
  }

  async function createApiKey(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setMessage(null)
    try {
      const data = await apiFetch<{ secret: string }>('/api/account/api-keys', {
        method: 'POST',
        body: { name: keyName },
      })
      setNewSecret(data.secret)
      await loadAccount()
      setMessageType('success')
      setMessage('API key created. Copy it now; it will not be shown again.')
    } catch (err) {
      setMessageType('error')
      setMessage(err instanceof Error ? err.message : 'Failed to create API key')
    }
  }

  async function revokeApiKey(id: string): Promise<void> {
    setMessage(null)
    try {
      await apiFetch(`/api/account/api-keys/${id}`, { method: 'DELETE' })
      await loadAccount()
      setMessageType('success')
      setMessage('API key revoked.')
    } catch (err) {
      setMessageType('error')
      setMessage(err instanceof Error ? err.message : 'Failed to revoke API key')
    }
  }

  return (
    <div className="stack">
      {/* Hero Section */}
      <Card glass>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-lg)' }}>
          <div>
            <p className="eyebrow">Account</p>
            <h1>Your identity, security, and activity.</h1>
            <p className="hero-text">Manage your Flux profile, API keys, linked accounts, and account history.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexShrink: 0 }}>
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-lg)', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--font-size-2xl)',
                  fontWeight: 'bold',
                }}
              >
                {user?.username?.[0] || 'F'}
              </div>
            )}
            <div>
              <p style={{ fontWeight: 'bold', margin: '0 0 var(--space-xs) 0' }}>{user?.username}</p>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', margin: 0 }}>
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Messages */}
      {message && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <Badge variant={messageType === 'success' ? 'success' : 'danger'}>
                {messageType === 'success' ? '✓' : '⚠️'}
              </Badge>
              <span>{message}</span>
            </div>
          </Card>
        </motion.div>
      )}

      {/* New Secret Display */}
      {newSecret && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <p className="eyebrow">API Key Secret</p>
            <p style={{ marginBottom: 'var(--space-md)' }}>Your new API key secret (shown only once):</p>
            <div
              style={{
                background: 'var(--color-neutral-100)',
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-family-mono)',
                wordBreak: 'break-all',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              {newSecret}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Profile & Linked Accounts */}
      <motion.div
        className="dashboard-grid"
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Profile Form */}
        <motion.div variants={staggerItemVariants}>
          <Card>
            <p className="eyebrow">Profile</p>
            <h3>Public details</h3>
            <form onSubmit={updateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <Input
                label="Username"
                value={profileForm.username}
                onChange={(event) => setProfileForm({ ...profileForm, username: event.target.value })}
                isRequired
              />
              <Input
                label="Avatar URL"
                type="url"
                value={profileForm.avatar}
                onChange={(event) => setProfileForm({ ...profileForm, avatar: event.target.value })}
                helpText="Public image URL for your profile picture"
              />
              <Button variant="primary" type="submit">
                Save profile
              </Button>
            </form>
          </Card>
        </motion.div>

        {/* Linked Accounts */}
        <motion.div variants={staggerItemVariants}>
          <Card>
            <p className="eyebrow">Linked</p>
            <h3>Connected accounts</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {linked.length === 0 ? (
                <p style={{ color: 'var(--color-neutral-500)' }}>No linked accounts</p>
              ) : (
                linked.map((account) => (
                  <div
                    key={account.provider}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 'var(--space-sm)',
                      borderBottom: '1px solid var(--color-neutral-200)',
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 'bold', margin: 0 }}>{account.provider}</p>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', margin: 0 }}>
                        {account.identifier || 'Not linked'}
                      </p>
                    </div>
                    <Badge variant={account.connected ? 'success' : 'danger'}>
                      {account.connected ? 'Connected' : 'Missing'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* API Keys */}
      <motion.div variants={staggerContainerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
        <Card>
          <p className="eyebrow">API</p>
          <h3>Personal access keys</h3>

          {/* Create Key Form */}
          <form onSubmit={createApiKey} style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <Input
              value={keyName}
              onChange={(event) => setKeyName(event.target.value)}
              label="Key name"
              placeholder="My API Key"
            />
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Button variant="primary" type="submit">
                Create key
              </Button>
            </div>
          </form>

          {/* API Keys List */}
          {apiKeys.length === 0 ? (
            <p style={{ color: 'var(--color-neutral-500)' }}>No API keys yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {apiKeys.map((apiKey) => (
                <div
                  key={apiKey.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--space-md)',
                    background: 'var(--color-neutral-50)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 'bold', margin: 0 }}>{apiKey.name}</p>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', margin: 0 }}>
                      {apiKey.prefix} • Created {formatDate(apiKey.created_at)} • Last used {formatDate(apiKey.last_used_at)}
                    </p>
                  </div>
                  <Button
                    variant={apiKey.revoked_at ? 'ghost' : 'danger'}
                    size="sm"
                    onClick={() => revokeApiKey(apiKey.id)}
                    disabled={Boolean(apiKey.revoked_at)}
                  >
                    {apiKey.revoked_at ? 'Revoked' : 'Revoke'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Security & Session Status */}
      <motion.div
        className="dashboard-grid"
        variants={staggerContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <motion.div variants={staggerItemVariants}>
          <Card>
            <p className="eyebrow">Security</p>
            <h3>Session status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Role</span>
                <Badge variant={user?.is_admin ? 'primary' : 'secondary'}>{user?.is_admin ? 'Admin' : 'Client'}</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Discord ID</span>
                <code style={{ fontSize: 'var(--font-size-sm)', padding: '4px 8px', background: 'var(--color-neutral-100)', borderRadius: '4px' }}>
                  {user?.discord_id}
                </code>
              </div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', marginTop: 'var(--space-md)' }}>
                Flux uses Discord OAuth for login. Password and 2FA features are not implemented because password authentication is not used.
              </p>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Activity - Coin Ledger & Audit */}
      <motion.div
        className="dashboard-grid"
        variants={staggerContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {/* Coin Ledger */}
        <motion.div variants={staggerItemVariants}>
          <Card>
            <p className="eyebrow">Ledger</p>
            <h3>Coin activity</h3>
            {activity.ledger.length === 0 ? (
              <p style={{ color: 'var(--color-neutral-500)' }}>No coin transactions yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {activity.ledger.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 'var(--space-sm)',
                      borderBottom: '1px solid var(--color-neutral-200)',
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 'bold', margin: 0 }}>{entry.description}</p>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', margin: 0 }}>
                        {entry.type} • {formatDate(entry.created_at)}
                      </p>
                    </div>
                    <Badge variant={entry.amount.startsWith('-') ? 'danger' : 'success'}>{entry.amount}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Audit Log */}
        <motion.div variants={staggerItemVariants}>
          <Card>
            <p className="eyebrow">Audit</p>
            <h3>Recent actions</h3>
            {activity.audit.length === 0 ? (
              <p style={{ color: 'var(--color-neutral-500)' }}>No recent actions</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {activity.audit.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 'var(--space-sm)',
                      borderBottom: '1px solid var(--color-neutral-200)',
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 'bold', margin: 0 }}>{entry.action}</p>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', margin: 0 }}>
                        {formatDate(entry.created_at)} • {entry.ip_address || 'local'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}


  async function loadAccount(): Promise<void> {
    try {
      const [activityData, linkedData, keysData] = await Promise.all([
        apiFetch<ActivityData>('/api/account/activity'),
        apiFetch<{ accounts: LinkedAccount[] }>('/api/account/linked-accounts'),
        apiFetch<{ api_keys: ApiKey[] }>('/api/account/api-keys'),
      ])
      setActivity(activityData)
      setLinked(linkedData.accounts || [])
      setApiKeys(keysData.api_keys || [])
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load account data')
    }
  }

  useEffect(() => {
    setProfileForm({ username: user?.username || '', avatar: user?.avatar || '' })
    loadAccount()
  }, [user?.username, user?.avatar])

  async function updateProfile(event: React.FormEvent<HTMLFormElement>): Promise<void> {
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
      setMessage(err instanceof Error ? err.message : 'Failed to update profile')
    }
  }

  async function createApiKey(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setMessage(null)
    try {
      const data = await apiFetch<{ secret: string }>('/api/account/api-keys', {
        method: 'POST',
        body: { name: keyName },
      })
      setNewSecret(data.secret)
      await loadAccount()
      setMessage('API key created. Copy it now; it will not be shown again.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to create API key')
    }
  }

  async function revokeApiKey(id: string): Promise<void> {
    setMessage(null)
    try {
      await apiFetch(`/api/account/api-keys/${id}`, { method: 'DELETE' })
      await loadAccount()
      setMessage('API key revoked.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to revoke API key')
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
          {user?.avatar ? (
            <img src={user.avatar} alt="" />
          ) : (
            <div className="avatar-fallback">{user?.username?.[0] || 'F'}</div>
          )}
          <div>
            <strong>{user?.username}</strong>
            <span>{user?.email}</span>
          </div>
        </div>
      </section>

      {message && <div className="glass-card notice">{message}</div>}
      {newSecret && <div className="code-block">New API key: {newSecret}</div>}

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
              <input
                className="input"
                value={profileForm.username}
                onChange={(event) =>
                  setProfileForm({ ...profileForm, username: event.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Avatar URL</span>
              <input
                className="input"
                value={profileForm.avatar}
                onChange={(event) =>
                  setProfileForm({ ...profileForm, avatar: event.target.value })
                }
              />
            </label>
            <button className="button button-primary" type="submit">
              Save profile
            </button>
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
                <span className={`status-chip ${account.connected ? 'online' : 'danger'}`}>
                  {account.connected ? 'Connected' : 'Missing'}
                </span>
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
            <input
              className="input terminal-input"
              value={keyName}
              onChange={(event) => setKeyName(event.target.value)}
            />
            <button className="button button-primary" type="submit">
              Create key
            </button>
          </form>
          <div className="list-stack spacious">
            {apiKeys.map((apiKey) => (
              <div className="list-row" key={apiKey.id}>
                <div>
                  <strong>{apiKey.name}</strong>
                  <span>
                    {apiKey.prefix} - created {formatDate(apiKey.created_at)} - last used{' '}
                    {formatDate(apiKey.last_used_at)}
                  </span>
                </div>
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => revokeApiKey(apiKey.id)}
                  disabled={Boolean(apiKey.revoked_at)}
                >
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
          <p className="muted">
            Flux currently uses Discord OAuth for login. Password and 2FA pages from MythicalDash are
            intentionally not copied because this app does not use password authentication.
          </p>
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
                  <span>
                    {entry.type} - {formatDate(entry.created_at)}
                  </span>
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
