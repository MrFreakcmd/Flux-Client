import { useEffect, useState, ChangeEvent, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { Card, Badge, Button, Input, PageHeader, PageTransition } from '../components'
import { useScrollReveal, staggerContainerVariants, staggerItemVariants } from '../hooks'
import styles from './AdminUsersPage.module.css'

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

  const { ref: usersRef, inView: usersInView } = useScrollReveal()

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
    const timer = setTimeout(() => {
      loadUsers()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  function handleSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    loadUsers()
  }

  function getStatusBadge(user: AdminUser) {
    if (user.is_suspended) {
      return <Badge variant="danger">Suspended</Badge>
    }
    if (user.is_admin) {
      return <Badge variant="primary">Admin</Badge>
    }
    return <Badge variant="secondary">User</Badge>
  }

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '0 var(--space-md)' }}>
        <PageHeader
          title="User Management"
          subtitle="Search and manage user accounts"
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Users' }
          ]}
        />

        {/* Search Form */}
        <motion.form
          onSubmit={handleSearch}
          style={{ display: 'flex', gap: 'var(--space-md)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Input
            type="text"
            placeholder="Search users by username or email..."
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <Button type="submit" variant="primary">
            Search
          </Button>
        </motion.form>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card variant="default">
              <div style={{ padding: 'var(--space-md)', color: 'var(--color-danger)' }}>
                <p style={{ margin: 0 }}>{error}</p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Users Table */}
        <motion.div
          ref={usersRef}
          initial={{ opacity: 0, y: 20 }}
          animate={usersInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
        >
          <Card variant="elevated">
            <div>
              <div style={{ marginBottom: 'var(--space-lg)', paddingBottom: 'var(--space-lg)', borderBottom: '1px solid var(--border-color)' }}>
                <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>Users</h2>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                  {loading ? 'Loading...' : `${total} total users`}
                </p>
              </div>

              {users.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  {users.map((user, idx) => (
                    <motion.div
                      key={user.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingBottom: 'var(--space-md)',
                        borderBottom: idx < users.length - 1 ? '1px solid var(--border-color)' : 'none',
                        cursor: 'pointer',
                      }}
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                      whileHover={{ x: 4 }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div style={{ flex: 1 }}>
                        <strong style={{ display: 'block', marginBottom: '4px' }}>{user.username}</strong>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                          {user.email} • {user.servers_count} servers
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                        {getStatusBadge(user)}
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                          {user.coins} coins
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--space-lg) 0' }}>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                    {loading ? 'Loading users...' : 'No users found'}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </PageTransition>
  )
}
