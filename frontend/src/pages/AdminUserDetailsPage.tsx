import { useEffect, useState, ChangeEvent, FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { apiFetch } from '../lib/api'
import { Button, Card, Input, Badge, PageHeader, PageTransition } from '../components'
import { useAriaLive } from '../hooks/useA11y'
import styles from './AdminUserDetailsPage.module.css'

interface UserDetails {
  id: string
  username: string
  email: string
  discord_id: string
  avatar: string | null
  coins: string
  is_admin: boolean
  limit_cpu: number
  limit_memory: number
  limit_disk: number
  limit_slots: number
  created_at: string
  updated_at: string
  servers: Array<{ id: string; name: string }>
  coin_ledger: Array<{
    id: number
    amount: string
    type: string
    description: string
    created_at: string
  }>
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
}

export default function AdminUserDetailsPage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    is_admin: false,
    limit_cpu: 100,
    limit_memory: 2048,
    limit_disk: 10000,
    limit_slots: 2,
  })
  const [grantForm, setGrantForm] = useState({ amount: '', description: '' })
  const { announcerRef, announce } = useAriaLive()

  useEffect(() => {
    if (!userId) return
    async function loadUser() {
      try {
        const data = await apiFetch<UserDetails>(`/api/admin/users/${userId}`)
        setUser(data)
        setEditForm({
          is_admin: data.is_admin,
          limit_cpu: data.limit_cpu,
          limit_memory: data.limit_memory,
          limit_disk: data.limit_disk,
          limit_slots: data.limit_slots,
        })
        announce(`User ${data.username} loaded`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load user'
        setError(msg)
        announce(msg, 'assertive')
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [userId, announce])

  async function handleUpdateUser(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    if (!userId) return
    setMessage(null)
    try {
      await apiFetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: editForm,
      })
      const msg = 'User limits updated successfully'
      setMessage(msg)
      announce(msg)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update user'
      setMessage(msg)
      announce(msg, 'assertive')
    }
  }

  async function handlePromoteUser(): Promise<void> {
    if (!userId) return
    setMessage(null)
    try {
      await apiFetch(`/api/admin/users/${userId}/promote`, { method: 'POST' })
      const msg = 'User promoted to admin'
      setMessage(msg)
      announce(msg)
      setEditForm({ ...editForm, is_admin: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to promote user'
      setMessage(msg)
      announce(msg, 'assertive')
    }
  }

  async function handleGrantCoins(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    if (!userId) return
    setMessage(null)
    try {
      await apiFetch(`/api/admin/users/${userId}/grant-coins`, {
        method: 'POST',
        body: grantForm,
      })
      const msg = 'Coins granted successfully'
      setMessage(msg)
      announce(msg)
      setGrantForm({ amount: '', description: '' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to grant coins'
      setMessage(msg)
      announce(msg, 'assertive')
    }
  }

  if (loading) {
    return (
      <PageTransition>
        <main className={styles.page}>
          <motion.div
            className={styles.loadingState}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className={styles.spinner} />
            <p>Loading user details...</p>
          </motion.div>
        </main>
      </PageTransition>
    )
  }

  if (error) {
    return (
      <PageTransition>
        <main className={styles.page}>
          <motion.div
            className={styles.errorState}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
          >
            <span>⚠️</span>
            <p>{error}</p>
            <Button variant="primary" onClick={() => navigate('/admin/users')}>
              Back to Users
            </Button>
          </motion.div>
        </main>
      </PageTransition>
    )
  }

  if (!user) {
    return (
      <PageTransition>
        <main className={styles.page}>
          <motion.div
            className={styles.errorState}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p>User not found</p>
            <Button variant="primary" onClick={() => navigate('/admin/users')}>
              Back to Users
            </Button>
          </motion.div>
        </main>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <main className={styles.page}>
        <div ref={announcerRef} aria-live="polite" aria-atomic="true" style={{ display: 'none' }} />

        {/* Hero */}
        <motion.section
          className={styles.hero}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.heroContent}>
            {user.avatar && <img src={user.avatar} alt={user.username} className={styles.avatar} />}
            <div>
              <h1>{user.username}</h1>
              <p>{user.email}</p>
              <div className={styles.badges}>
                <Badge variant={user.is_admin ? 'danger' : 'secondary'}>
                  {user.is_admin ? '👑 Admin' : 'User'}
                </Badge>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Message */}
        {message && (
          <motion.div
            className={styles.messageBanner}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            role="status"
          >
            ✓ {message}
          </motion.div>
        )}

        {/* Content Grid */}
        <motion.div
          className={styles.gridSection}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* User Info */}
          <motion.div variants={itemVariants}>
            <Card className={styles.card}>
              <h2>User Information</h2>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <label>Discord ID</label>
                  <code>{user.discord_id}</code>
                </div>
                <div className={styles.infoItem}>
                  <label>Coins</label>
                  <strong className={styles.coinValue}>{user.coins}</strong>
                </div>
                <div className={styles.infoItem}>
                  <label>Created</label>
                  <time>{new Date(user.created_at).toLocaleString()}</time>
                </div>
                <div className={styles.infoItem}>
                  <label>Updated</label>
                  <time>{new Date(user.updated_at).toLocaleString()}</time>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Resource Limits */}
          <motion.div variants={itemVariants}>
            <Card className={styles.card}>
              <h2>Resource Limits</h2>
              <form onSubmit={handleUpdateUser} className={styles.form}>
                <div className={styles.formGroup}>
                  <label htmlFor="cpu-limit">CPU Limit (%)</label>
                  <Input
                    id="cpu-limit"
                    type="number"
                    value={editForm.limit_cpu}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setEditForm({ ...editForm, limit_cpu: parseInt(e.target.value) })
                    }
                    min="0"
                    max="100"
                    aria-label="CPU limit percentage"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="memory-limit">Memory Limit (MB)</label>
                  <Input
                    id="memory-limit"
                    type="number"
                    value={editForm.limit_memory}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setEditForm({ ...editForm, limit_memory: parseInt(e.target.value) })
                    }
                    min="512"
                    aria-label="Memory limit in megabytes"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="disk-limit">Disk Limit (MB)</label>
                  <Input
                    id="disk-limit"
                    type="number"
                    value={editForm.limit_disk}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setEditForm({ ...editForm, limit_disk: parseInt(e.target.value) })
                    }
                    min="1000"
                    aria-label="Disk limit in megabytes"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="slots-limit">Slot Limit</label>
                  <Input
                    id="slots-limit"
                    type="number"
                    value={editForm.limit_slots}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setEditForm({ ...editForm, limit_slots: parseInt(e.target.value) })
                    }
                    min="1"
                    aria-label="Server slot limit"
                  />
                </div>

                <div className={styles.actions}>
                  <Button type="submit" variant="primary">
                    Update Limits
                  </Button>
                  {!user.is_admin && (
                    <Button type="button" variant="warning" onClick={handlePromoteUser}>
                      Promote to Admin
                    </Button>
                  )}
                </div>
              </form>
            </Card>
          </motion.div>

          {/* Grant Coins */}
          <motion.div variants={itemVariants}>
            <Card className={styles.card}>
              <h2>Grant Coins</h2>
              <form onSubmit={handleGrantCoins} className={styles.form}>
                <div className={styles.formGroup}>
                  <label htmlFor="coin-amount">Amount</label>
                  <Input
                    id="coin-amount"
                    type="number"
                    value={grantForm.amount}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setGrantForm({ ...grantForm, amount: e.target.value })
                    }
                    min="0"
                    placeholder="0"
                    required
                    aria-label="Coin amount to grant"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="coin-description">Description</label>
                  <Input
                    id="coin-description"
                    type="text"
                    value={grantForm.description}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setGrantForm({ ...grantForm, description: e.target.value })
                    }
                    placeholder="Reason for grant"
                    required
                    aria-label="Reason for coin grant"
                  />
                </div>
                <Button type="submit" variant="success">
                  Grant Coins
                </Button>
              </form>
            </Card>
          </motion.div>
        </motion.div>

        {/* Servers List */}
        <motion.section
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.3 }}
        >
          <Card className={styles.card}>
            <h2>Servers ({user.servers.length})</h2>
            {user.servers.length === 0 ? (
              <p className={styles.emptyText}>No servers owned by this user</p>
            ) : (
              <div className={styles.serversList}>
                {user.servers.map((server) => (
                  <div key={server.id} className={styles.serverItem}>
                    <span className={styles.serverIcon}>🖥️</span>
                    <span className={styles.serverName}>{server.name}</span>
                    <small className={styles.serverId}>{server.id}</small>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.section>

        {/* Transaction History */}
        <motion.section
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
        >
          <Card className={styles.card}>
            <h2>Transaction History</h2>
            {user.coin_ledger.length === 0 ? (
              <p className={styles.emptyText}>No transactions</p>
            ) : (
              <div className={styles.ledger}>
                {user.coin_ledger.map((entry) => (
                  <div key={entry.id} className={styles.ledgerEntry}>
                    <div className={styles.entryInfo}>
                      <p className={styles.entryDescription}>{entry.description}</p>
                      <span className={styles.entryType}>{entry.type}</span>
                    </div>
                    <div className={styles.entryAmount}>
                      <strong>{entry.amount} coins</strong>
                      <time className={styles.entryDate}>
                        {new Date(entry.created_at).toLocaleDateString()}
                      </time>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.section>

        {/* Back Button */}
        <motion.div
          className={styles.backButton}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button variant="ghost" onClick={() => navigate('/admin/users')}>
            ← Back to Users
          </Button>
        </motion.div>
      </main>
    </PageTransition>
  )
}
