import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch('/api/admin/dashboard/stats')
      setStats(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="stack">
        <section className="dashboard-hero glass-card">
          <div>
            <h1>Admin Dashboard</h1>
            <p>Loading statistics...</p>
          </div>
        </section>
      </div>
    )
  }

  if (error) {
    return (
      <div className="stack">
        <section className="dashboard-hero glass-card">
          <div>
            <h1>Admin Dashboard</h1>
            <p className="error-message">{error}</p>
            <button onClick={loadStats} className="btn btn-primary">
              Retry
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="stack">
      <section className="dashboard-hero glass-card">
        <div>
          <h1>Admin Dashboard</h1>
          <p>System overview and statistics</p>
        </div>
      </section>

      <div className="grid grid-2">
        <div className="glass-card">
          <h3>Total Users</h3>
          <p className="stat-number">{stats?.total_users || 0}</p>
          <p className="stat-label">Registered accounts</p>
        </div>

        <div className="glass-card">
          <h3>Active Users</h3>
          <p className="stat-number">{stats?.active_users || 0}</p>
          <p className="stat-label">Users with servers</p>
        </div>

        <div className="glass-card">
          <h3>Total Servers</h3>
          <p className="stat-number">{stats?.total_servers || 0}</p>
          <p className="stat-label">Active server instances</p>
        </div>

        <div className="glass-card">
          <h3>Coins Issued</h3>
          <p className="stat-number">{stats?.total_coins_issued || '0.00'}</p>
          <p className="stat-label">Total coins in circulation</p>
        </div>
      </div>

      <section className="glass-card">
        <h2>Top Users by Balance</h2>
        {stats?.top_users && stats.top_users.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.coins} coins</td>
                    <td>
                      <a
                        href={`/admin/users/${user.id}`}
                        className="btn btn-sm btn-secondary"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No user data available</p>
        )}
      </section>
    </div>
  )
}
