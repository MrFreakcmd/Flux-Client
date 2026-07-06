import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

interface AdminStats {
  total_users: number
  active_users: number
  total_servers: number
  total_coins_issued: string
  top_users: Array<{ id: string; username: string; coins: string }>
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<AdminStats>('/api/admin/dashboard/stats')
      .then((data) => {
        setStats(data)
        setError(null)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load admin stats')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="stack">
        <section className="dashboard-hero glass-card">
          <p className="eyebrow">Admin Dashboard</p>
          <h1>Loading...</h1>
        </section>
      </div>
    )
  }

  if (error) {
    return (
      <div className="stack">
        <section className="dashboard-hero glass-card">
          <p className="eyebrow">Admin Dashboard</p>
          <h1>Error</h1>
          <p className="error-message">{error}</p>
        </section>
      </div>
    )
  }

  return (
    <div className="stack">
      <section className="dashboard-hero glass-card">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>System Overview</h1>
          <p className="hero-text">Platform statistics and user management.</p>
        </div>
      </section>

      {stats && (
        <section className="dashboard-grid">
          <article className="glass-card panel">
            <p className="eyebrow">Users</p>
            <h3>{stats.total_users}</h3>
            <p style={{ opacity: 0.7 }}>{stats.active_users} active</p>
          </article>

          <article className="glass-card panel">
            <p className="eyebrow">Servers</p>
            <h3>{stats.total_servers}</h3>
            <p style={{ opacity: 0.7 }}>provisioned</p>
          </article>

          <article className="glass-card panel">
            <p className="eyebrow">Coins</p>
            <h3>{stats.total_coins_issued}</h3>
            <p style={{ opacity: 0.7 }}>issued</p>
          </article>
        </section>
      )}

      {stats && stats.top_users.length > 0 && (
        <section className="glass-card panel">
          <p className="eyebrow">Top Users</p>
          <h3>Coin leaders</h3>
          {stats.top_users.map((topUser, idx) => (
            <div key={topUser.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span>
                {idx + 1}. {topUser.username}
              </span>
              <strong>{topUser.coins} coins</strong>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
