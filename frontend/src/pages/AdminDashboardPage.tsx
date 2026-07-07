import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'
import { Card, Badge, PageTransition } from '../components'
import { useScrollReveal, staggerContainerVariants, staggerItemVariants } from '../hooks'
import styles from './AdminDashboardPage.module.css'

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

  const { ref: statsRef, inView: statsInView } = useScrollReveal()
  const { ref: usersRef, inView: usersInView } = useScrollReveal()

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
      <PageTransition>
        <div className={styles.container}>
          <section className={styles.hero}>
            <p className={styles.eyebrow}>Admin Dashboard</p>
            <h1>Loading stats...</h1>
          </section>
        </div>
      </PageTransition>
    )
  }

  if (error) {
    return (
      <PageTransition>
        <div className={styles.container}>
          <section className={styles.hero}>
            <p className={styles.eyebrow}>Admin Dashboard</p>
            <h1>Error</h1>
            <p className={styles.error}>{error}</p>
          </section>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className={styles.container}>
        <motion.section
          className={styles.hero}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <p className={styles.eyebrow}>Admin</p>
            <h1>System Overview</h1>
            <p className={styles.heroText}>Platform statistics and user management.</p>
          </div>
        </motion.section>

        {stats && (
          <>
            {/* Stats Grid */}
            <motion.section
              ref={statsRef}
              className={styles.statsGrid}
              variants={staggerContainerVariants}
              initial="hidden"
              animate={statsInView ? "visible" : "hidden"}
            >
              <motion.div variants={staggerItemVariants}>
                <Card glass hover>
                  <div className={styles.statCard}>
                    <p className={styles.label}>Total Users</p>
                    <h3 className={styles.value}>{stats.total_users}</h3>
                    <Badge variant="primary" size="sm">
                      {stats.active_users} active
                    </Badge>
                  </div>
                </Card>
              </motion.div>

              <motion.div variants={staggerItemVariants}>
                <Card glass hover>
                  <div className={styles.statCard}>
                    <p className={styles.label}>Servers</p>
                    <h3 className={styles.value}>{stats.total_servers}</h3>
                    <p className={styles.sublabel}>provisioned</p>
                  </div>
                </Card>
              </motion.div>

              <motion.div variants={staggerItemVariants}>
                <Card glass hover>
                  <div className={styles.statCard}>
                    <p className={styles.label}>Coins Issued</p>
                    <h3 className={styles.value}>{stats.total_coins_issued}</h3>
                    <p className={styles.sublabel}>total circulation</p>
                  </div>
                </Card>
              </motion.div>
            </motion.section>

            {/* Top Users */}
            {stats.top_users.length > 0 && (
              <motion.div
                ref={usersRef}
                initial={{ opacity: 0, y: 20 }}
                animate={usersInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <Card glass>
                  <div className={styles.topUsersCard}>
                    <div className={styles.cardHeader}>
                      <div>
                        <p className={styles.label}>Leaderboard</p>
                        <h3>Top Coin Holders</h3>
                      </div>
                      <Badge variant="success">Top {stats.top_users.length}</Badge>
                    </div>

                    <div className={styles.usersList}>
                      {stats.top_users.map((topUser, idx) => (
                        <motion.div
                          key={topUser.id}
                          className={styles.userRow}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <div className={styles.userRank}>
                            <Badge variant="secondary" size="sm">
                              #{idx + 1}
                            </Badge>
                          </div>
                          <div className={styles.userName}>
                            <strong>{topUser.username}</strong>
                          </div>
                          <div className={styles.userCoins}>
                            <strong>{topUser.coins}</strong>
                            <span>coins</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  )
}
