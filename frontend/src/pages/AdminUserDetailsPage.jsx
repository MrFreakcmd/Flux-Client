import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'

export default function AdminUserDetailsPage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const [editForm, setEditForm] = useState({
    is_admin: false,
    limit_cpu: 100,
    limit_memory: 2048,
    limit_disk: 10000,
    limit_slots: 2,
  })

  const [grantForm, setGrantForm] = useState({
    amount: '',
    description: '',
  })

  useEffect(() => {
    loadUser()
  }, [userId])

  async function loadUser() {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch(`/api/admin/users/${userId}`)
      setUser(data)
      setEditForm({
        is_admin: data.is_admin,
        limit_cpu: data.limit_cpu,
        limit_memory: data.limit_memory,
        limit_disk: data.limit_disk,
        limit_slots: data.limit_slots,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateUser(e) {
    e.preventDefault()
    setMessage(null)
    setError(null)
    try {
      await apiFetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: editForm,
      })
      setMessage('User updated successfully')
      await loadUser()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handlePromoteUser() {
    setMessage(null)
    setError(null)
    try {
      await apiFetch(`/api/admin/users/${userId}/promote`, {
        method: 'POST',
      })
      setMessage('User promoted to admin successfully')
      await loadUser()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDemoteUser() {
    setMessage(null)
    setError(null)
    try {
      await apiFetch(`/api/admin/users/${userId}/demote`, {
        method: 'POST',
      })
      setMessage('User demoted from admin successfully')
      await loadUser()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSuspendUser(suspend) {
    setMessage(null)
    setError(null)
    try {
      await apiFetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        body: { suspend },
      })
      setMessage(`User ${suspend ? 'suspended' : 'unsuspended'} successfully`)
      await loadUser()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleGrantCoins(e) {
    e.preventDefault()
    setMessage(null)
    setError(null)
    try {
      await apiFetch(`/api/admin/users/${userId}/grant-coins`, {
        method: 'POST',
        body: grantForm,
      })
      setMessage('Coins granted successfully')
      setGrantForm({ amount: '', description: '' })
      await loadUser()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="stack">
        <section className="dashboard-hero glass-card">
          <div>
            <h1>User Details</h1>
            <p>Loading user information...</p>
          </div>
        </section>
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className="stack">
        <section className="dashboard-hero glass-card">
          <div>
            <h1>User Details</h1>
            <p className="error-message">{error}</p>
            <button onClick={() => navigate('/admin/users')} className="btn btn-secondary">
              Back to Users
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
          <h1>User Details</h1>
          <button onClick={() => navigate('/admin/users')} className="btn btn-secondary">
            ← Back to Users
          </button>
        </div>
      </section>

      {message && (
        <div className="glass-card success-message">
          <p>{message}</p>
        </div>
      )}

      {error && (
        <div className="glass-card error-message">
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-2">
        <section className="glass-card">
          <h2>User Information</h2>
          <div className="user-info">
            {user.avatar && (
              <img src={user.avatar} alt={user.username} className="user-avatar" />
            )}
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Username:</span>
                <span className="info-value">{user.username}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span className="info-value">{user.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Discord ID:</span>
                <span className="info-value">{user.discord_id}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Coins:</span>
                <span className="info-value">{user.coins}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Created:</span>
                <span className="info-value">
                  {new Date(user.created_at).toLocaleString()}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Updated:</span>
                <span className="info-value">
                  {new Date(user.updated_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="glass-card">
          <h2>Edit User</h2>
          <form onSubmit={handleUpdateUser} className="form-stack">
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={editForm.is_admin}
                  onChange={(e) =>
                    setEditForm({ ...editForm, is_admin: e.target.checked })
                  }
                />
                <span>Admin Access</span>
              </label>
            </div>

            <div className="form-group">
              <label>Quick Admin Actions</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handlePromoteUser}
                  disabled={user.is_admin}
                  className="btn btn-success"
                  title={user.is_admin ? 'User is already an admin' : 'Promote to admin'}
                >
                  Promote to Admin
                </button>
                <button
                  type="button"
                  onClick={handleDemoteUser}
                  disabled={!user.is_admin}
                  className="btn btn-warning"
                  title={!user.is_admin ? 'User is not an admin' : 'Demote from admin'}
                >
                  Demote from Admin
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>CPU Limit (%)</label>
              <input
                type="number"
                value={editForm.limit_cpu}
                onChange={(e) =>
                  setEditForm({ ...editForm, limit_cpu: parseInt(e.target.value) })
                }
                min="0"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Memory Limit (MB)</label>
              <input
                type="number"
                value={editForm.limit_memory}
                onChange={(e) =>
                  setEditForm({ ...editForm, limit_memory: parseInt(e.target.value) })
                }
                min="0"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Disk Limit (MB)</label>
              <input
                type="number"
                value={editForm.limit_disk}
                onChange={(e) =>
                  setEditForm({ ...editForm, limit_disk: parseInt(e.target.value) })
                }
                min="0"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Server Slots</label>
              <input
                type="number"
                value={editForm.limit_slots}
                onChange={(e) =>
                  setEditForm({ ...editForm, limit_slots: parseInt(e.target.value) })
                }
                min="0"
                className="form-input"
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Update User
            </button>
            <button
              type="button"
              onClick={() => handleSuspendUser(!user.is_suspended)}
              className={`btn ${user.is_suspended ? 'btn-success' : 'btn-danger'}`}
            >
              {user.is_suspended ? 'Unsuspend User' : 'Suspend User'}
            </button>
          </form>
        </section>
      </div>

      <section className="glass-card">
        <h2>Grant Coins</h2>
        <form onSubmit={handleGrantCoins} className="form-inline">
          <div className="form-group">
            <label>Amount</label>
            <input
              type="number"
              step="0.01"
              value={grantForm.amount}
              onChange={(e) => setGrantForm({ ...grantForm, amount: e.target.value })}
              placeholder="0.00"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={grantForm.description}
              onChange={(e) =>
                setGrantForm({ ...grantForm, description: e.target.value })
              }
              placeholder="Reason for grant"
              className="form-input"
            />
          </div>

          <button type="submit" className="btn btn-success">
            Grant Coins
          </button>
        </form>
      </section>

      <section className="glass-card">
        <h2>Servers ({user.servers?.length || 0})</h2>
        {user.servers && user.servers.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>CPU</th>
                  <th>Memory</th>
                  <th>Disk</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {user.servers.map((server) => (
                  <tr key={server.id}>
                    <td>{server.name}</td>
                    <td>{server.cpu_limit}%</td>
                    <td>{server.memory_limit} MB</td>
                    <td>{server.disk_limit} MB</td>
                    <td>
                      {server.is_suspended ? (
                        <span className="badge badge-danger">Suspended</span>
                      ) : (
                        <span className="badge badge-success">Active</span>
                      )}
                    </td>
                    <td>{new Date(server.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No servers created</p>
        )}
      </section>

      <section className="glass-card">
        <h2>Coin Transaction History</h2>
        {user.coin_ledger && user.coin_ledger.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Balance</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {user.coin_ledger.map((entry) => (
                  <tr key={entry.id}>
                    <td>{new Date(entry.created_at).toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${getTypeBadge(entry.type)}`}>
                        {entry.type}
                      </span>
                    </td>
                    <td className={entry.amount >= 0 ? 'text-success' : 'text-danger'}>
                      {entry.amount >= 0 ? '+' : ''}
                      {entry.amount}
                    </td>
                    <td>{entry.running_balance}</td>
                    <td>{entry.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No transaction history</p>
        )}
      </section>
    </div>
  )
}

function getTypeBadge(type) {
  const badges = {
    grant: 'success',
    purchase: 'primary',
    referral: 'info',
    afk: 'secondary',
    p2p_transfer: 'warning',
    topup: 'success',
  }
  return badges[type] || 'secondary'
}
