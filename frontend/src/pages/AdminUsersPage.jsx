import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [limit] = useState(50)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadUsers()
  }, [skip, search])

  async function loadUsers() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
      })
      if (search) {
        params.append('search', search)
      }
      const data = await apiFetch(`/api/admin/users?${params}`)
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault()
    setSkip(0)
    loadUsers()
  }

  function goToUser(userId) {
    navigate(`/admin/users/${userId}`)
  }

  function nextPage() {
    if (skip + limit < total) {
      setSkip(skip + limit)
    }
  }

  function prevPage() {
    if (skip > 0) {
      setSkip(Math.max(0, skip - limit))
    }
  }

  return (
    <div className="stack">
      <section className="dashboard-hero glass-card">
        <div>
          <h1>User Management</h1>
          <p>Manage all registered users</p>
        </div>
      </section>

      <section className="glass-card">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input
            type="text"
            placeholder="Search by username, email, or Discord ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setSkip(0)
              }}
              className="btn btn-secondary"
            >
              Clear
            </button>
          )}
        </form>
      </section>

      <section className="glass-card">
        {error && <p className="error-message">{error}</p>}

        {loading ? (
          <p>Loading users...</p>
        ) : users.length === 0 ? (
          <p>No users found</p>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Discord ID</th>
                    <th>Coins</th>
                    <th>Servers</th>
                    <th>Admin</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>{user.discord_id}</td>
                      <td>{user.coins}</td>
                      <td>{user.servers_count}</td>
                      <td>
                        {user.is_admin ? (
                          <span className="badge badge-success">Yes</span>
                        ) : (
                          <span className="badge badge-secondary">No</span>
                        )}
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={() => goToUser(user.id)}
                          className="btn btn-sm btn-primary"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button
                onClick={prevPage}
                disabled={skip === 0}
                className="btn btn-secondary"
              >
                Previous
              </button>
              <span className="pagination-info">
                Showing {skip + 1}-{Math.min(skip + limit, total)} of {total}
              </span>
              <button
                onClick={nextPage}
                disabled={skip + limit >= total}
                className="btn btn-secondary"
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
