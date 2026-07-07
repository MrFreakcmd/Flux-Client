import { useEffect, useState, ChangeEvent, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { Card, Badge, Button, Input, PageTransition } from '../components'
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
      <div className={styles.container}>
        {/* Hero Section */}
        <motion.section
          className={styles.hero}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <p className={styles.eyebrow}>Admin</p>
            <h1>User Management</h1>
            <p className={styles.heroText}>
              Search and manage user accounts.
            </p>
          </div>
        </motion.section>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <div className={styles.errorCard}>
                <p className={styles.errorText}>{error}</p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card glass>
            <div className={styles.searchCard}>
              <form onSubmit={handleSearch} className={styles.searchForm}>
                <Input
                  type="text"
                  placeholder="Search by username, email, or Discord ID..."
                  value={search}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  className={styles.searchInput}
                />
                <Button type="submit" variant="primary" size="md">
                  Search
                </Button>
              </form>
            </div>
          </Card>
        </motion.div>

        {/* Users Table */}
        <motion.div
          ref={usersRef}
          initial={{ opacity: 0, y: 20 }}
          animate={usersInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card glass>
            <div className={styles.usersCard}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.label}>Results</p>
                  <h3>Users ({users.length} of {total})</h3>
                </div>
                {loading && (
                  <div className={styles.loadingBadge}>
                    <div className={styles.spinner} />
                    Loading...
                  </div>
                )}
              </div>

              {users.length > 0 ? (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead className={styles.tableHead}>
                      <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Coins</th>
                        <th>Servers</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody className={styles.tableBody}>
                      {users.map((adminUser, idx) => (
                        <motion.tr
                          key={adminUser.id}
                          className={styles.tableRow}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <td className={styles.cellUsername}>
                            <strong>{adminUser.username}</strong>
                          </td>
                          <td className={styles.cellEmail}>
                            <code>{adminUser.email}</code>
                          </td>
                          <td className={styles.cellCoins}>
                            {adminUser.coins}
                          </td>
                          <td className={styles.cellServers}>
                            {adminUser.servers_count}
                          </td>
                          <td className={styles.cellStatus}>
                            {getStatusBadge(adminUser)}
                          </td>
                          <td className={styles.cellAction}>
                            <Button
                              onClick={() => navigate(`/admin/users/${adminUser.id}`)}
                              variant="ghost"
                              size="sm"
                            >
                              Details
                            </Button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <p>
                    {loading ? 'Loading users...' : search ? 'No users found.' : 'No users to display.'}
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
