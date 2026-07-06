import { useEffect, useState, ChangeEvent, FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'

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
  coin_ledger: Array<{ id: number; amount: string; type: string; description: string; created_at: string }>
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

  useEffect(() => {
    if (!userId) return
    apiFetch<UserDetails>(`/api/admin/users/${userId}`)
      .then((data) => {
        setUser(data)
        setEditForm({
          is_admin: data.is_admin,
          limit_cpu: data.limit_cpu,
          limit_memory: data.limit_memory,
          limit_disk: data.limit_disk,
          limit_slots: data.limit_slots,
        })
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load user'))
      .finally(() => setLoading(false))
  }, [userId])

  async function handleUpdateUser(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    if (!userId) return
    setMessage(null)
    try {
      await apiFetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: editForm,
      })
      setMessage('User updated successfully')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  async function handlePromoteUser(): Promise<void> {
    if (!userId) return
    setMessage(null)
    try {
      await apiFetch(`/api/admin/users/${userId}/promote`, { method: 'POST' })
      setMessage('User promoted to admin')
      setEditForm({ ...editForm, is_admin: true })
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to promote user')
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
      setMessage('Coins granted successfully')
      setGrantForm({ amount: '', description: '' })
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to grant coins')
    }
  }

  if (loading) return <div className="glass-card">Loading user details...</div>
  if (error) return <div className="glass-card notice error">{error}</div>
  if (!user) return <div className="glass-card">User not found</div>

  return (
    <div className="stack">
      <section className="dashboard-hero glass-card">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>{user.username}</h1>
          <p className="hero-text">{user.email}</p>
        </div>
      </section>

      {message && <div className="glass-card notice">{message}</div>}

      <section className="dashboard-grid">
        <article className="glass-card panel">
          <h3>User Info</h3>
          <p>
            <strong>Discord ID:</strong> {user.discord_id}
          </p>
          <p>
            <strong>Coins:</strong> {user.coins}
          </p>
          <p>
            <strong>Created:</strong> {new Date(user.created_at).toLocaleString()}
          </p>
          <p>
            <strong>Role:</strong> {user.is_admin ? 'Admin' : 'User'}
          </p>
        </article>

        <article className="glass-card panel">
          <h3>Limits</h3>
          <form onSubmit={handleUpdateUser}>
            <label>
              CPU (%)
              <input
                type="number"
                value={editForm.limit_cpu}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setEditForm({ ...editForm, limit_cpu: parseInt(e.target.value) })
                }
                className="input"
              />
            </label>
            <label>
              Memory (MB)
              <input
                type="number"
                value={editForm.limit_memory}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setEditForm({ ...editForm, limit_memory: parseInt(e.target.value) })
                }
                className="input"
              />
            </label>
            <button type="submit" className="button button-primary">
              Update
            </button>
            {!user.is_admin && (
              <button type="button" onClick={handlePromoteUser} className="button button-success">
                Promote to Admin
              </button>
            )}
          </form>
        </article>
      </section>

      <section className="glass-card panel">
        <h3>Grant Coins</h3>
        <form onSubmit={handleGrantCoins}>
          <label>
            Amount
            <input
              type="number"
              value={grantForm.amount}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setGrantForm({ ...grantForm, amount: e.target.value })
              }
              className="input"
            />
          </label>
          <label>
            Description
            <input
              type="text"
              value={grantForm.description}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setGrantForm({ ...grantForm, description: e.target.value })
              }
              className="input"
            />
          </label>
          <button type="submit" className="button button-primary">
            Grant Coins
          </button>
        </form>
      </section>

      <section className="glass-card panel">
        <h3>Servers ({user.servers.length})</h3>
        {user.servers.map((server) => (
          <div key={server.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            {server.name}
          </div>
        ))}
      </section>

      <section className="glass-card panel">
        <h3>Transaction History</h3>
        {user.coin_ledger.map((entry) => (
          <div key={entry.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div>
              <strong>{entry.description}</strong>
              <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>{entry.type}</p>
            </div>
            <div>{entry.amount}</div>
          </div>
        ))}
      </section>
    </div>
  )
}
