import { useEffect, useState, ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'

interface AdminUser {
  id: string
  username: string
  email: string
  discord_id: string
  coins: string
  is_admin: boolean
  is_suspended: boolean
  created_at: string
  servers_count: number
}

interface UsersResponse {
  total: number
  users: AdminUser[]
}

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadUsers(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const query = search ? `&search=${encodeURIComponent(search)}` : ''
      const data = await apiFetch<UsersResponse>(`/api/admin/users?limit=50${query}`)
      setUsers(data.users)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [search])

  function handleSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    loadUsers()
  }

  return (
    <div className="stack">
      <section className="dashboard-hero glass-card">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>User Management</h1>
          <p className="hero-text">Search and manage user accounts.</p>
        </div>
      </section>

      {error && <div className="glass-card notice error">{error}</div>}

      <section className="glass-card panel">
        <h3>Search Users</h3>
        <form onSubmit={handleSearch}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder="Username, email, or Discord ID"
              className="input"
              style={{ flex: 1 }}
            />
            <button type="submit" className="button button-primary">
              Search
            </button>
          </div>
        </form>
      </section>

      <section className="glass-card panel">
        <h3>
          Users ({users.length} of {total})
        </h3>
        {loading ? (
          <p>Loading...</p>
        ) : users.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0' }}>Username</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0' }}>Coins</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0' }}></th>
                </tr>
              </thead>
              <tbody>
                {users.map((adminUser) => (
                  <tr key={adminUser.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem 0' }}>
                      <strong>{adminUser.username}</strong>
                    </td>
                    <td style={{ padding: '0.75rem 0', opacity: 0.7 }}>{adminUser.email}</td>
                    <td style={{ padding: '0.75rem 0' }}>{adminUser.coins}</td>
                    <td style={{ padding: '0.75rem 0' }}>
                      {adminUser.is_suspended ? (
                        <span className="badge badge-danger">Suspended</span>
                      ) : adminUser.is_admin ? (
                        <span className="badge badge-success">Admin</span>
                      ) : (
                        <span className="badge badge-info">User</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>
                      <button
                        onClick={() => navigate(`/admin/users/${adminUser.id}`)}
                        className="button button-ghost button-sm"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ opacity: 0.6 }}>No users found.</p>
        )}
      </section>
    </div>
  )
}
