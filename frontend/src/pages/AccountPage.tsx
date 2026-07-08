import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'
import { Card, Badge, Button, Input, PageHeader } from '../components'
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '0 var(--space-md)' }}>
      {/* Hero Section */}
      <Card glass>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-lg)' }}>
          <div>
            <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-accent)', margin: 0 }}>Account</p>
            <h1>Your identity, security, and activity.</h1>
            <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-neutral-400)', margin: 0, lineHeight: 1.6 }}>
              Manage your Flux profile, API keys, linked accounts, and account history.
            </p>
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
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', margin: 0 }}>{user?.email}</p>
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
            <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-neutral-400)', margin: 0, marginBottom: 'var(--space-sm)' }}>API Key Secret</p>
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
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-md)', width: '100%' }}
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Profile Form */}
        <motion.div variants={staggerItemVariants}>
          <Card>
            <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-neutral-400)', margin: 0, marginBottom: 'var(--space-sm)' }}>Profile</p>
            <h3 style={{ margin: 0, marginBottom: 'var(--space-md)' }}>Public details</h3>
            <form onSubmit={updateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <Input
                type="text"
                placeholder="Username"
                value={profileForm.username}
                onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
              />
              <Input
                type="url"
                placeholder="Avatar URL"
                value={profileForm.avatar}
                onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
              />
              <Button variant="primary" type="submit" size="md">
                Save profile
              </Button>
            </form>
          </Card>
        </motion.div>

        {/* Linked Accounts */}
        <motion.div variants={staggerItemVariants}>
          <Card>
            <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-neutral-400)', margin: 0, marginBottom: 'var(--space-sm)' }}>Linked</p>
            <h3 style={{ margin: 0, marginBottom: 'var(--space-md)' }}>Connected accounts</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {linked.length === 0 ? (
                <p style={{ color: 'var(--color-neutral-500)', margin: 0 }}>No linked accounts</p>
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
          <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-neutral-400)', margin: 0, marginBottom: 'var(--space-sm)' }}>API</p>
          <h3 style={{ margin: 0, marginBottom: 'var(--space-md)' }}>Personal access keys</h3>

          {/* Create Key Form */}
          <form onSubmit={createApiKey} style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Input
                type="text"
                placeholder="Key name"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
            </div>
            <Button variant="primary" type="submit" size="md">
              Create key
            </Button>
          </form>

          {/* API Keys List */}
          {apiKeys.length === 0 ? (
            <p style={{ color: 'var(--color-neutral-500)', margin: 0 }}>No API keys yet</p>
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
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-md)', width: '100%' }}
        variants={staggerContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <motion.div variants={staggerItemVariants}>
          <Card>
            <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-neutral-400)', margin: 0, marginBottom: 'var(--space-sm)' }}>Security</p>
            <h3 style={{ margin: 0, marginBottom: 'var(--space-md)' }}>Session status</h3>
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
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', marginTop: 'var(--space-md)', margin: 0 }}>
                Flux uses Discord OAuth for login. Password and 2FA features are not implemented because password authentication is not used.
              </p>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Activity - Coin Ledger & Audit */}
      <motion.div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-md)', width: '100%' }}
        variants={staggerContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <motion.div variants={staggerItemVariants}>
          <Card>
            <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-neutral-400)', margin: 0, marginBottom: 'var(--space-sm)' }}>Ledger</p>
            <h3 style={{ margin: 0, marginBottom: 'var(--space-md)' }}>Coin activity</h3>
            {activity.ledger.length === 0 ? (
              <p style={{ color: 'var(--color-neutral-500)', margin: 0 }}>No coin transactions yet</p>
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

        <motion.div variants={staggerItemVariants}>
          <Card>
            <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-neutral-400)', margin: 0, marginBottom: 'var(--space-sm)' }}>Audit</p>
            <h3 style={{ margin: 0, marginBottom: 'var(--space-md)' }}>Recent actions</h3>
            {activity.audit.length === 0 ? (
              <p style={{ color: 'var(--color-neutral-500)', margin: 0 }}>No recent actions</p>
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
