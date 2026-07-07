import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'
import { Card, Badge, Button } from '../components'
import { useScrollReveal, staggerContainerVariants, staggerItemVariants } from '../hooks'

interface Server {
  id: string
  name: string
  calagopus_uuid: string
  is_suspended: boolean
}

interface Announcement {
  id: string
  title: string
  content: string
  created_at: string
}

interface PriceInfo {
  id: string
  name: string
  price: number
}

interface ReferralInfo {
  code: string
}

export default function DashboardPage() {
  const { user, refreshUser } = useAuth()
  const [servers, setServers] = useState<Server[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [prices, setPrices] = useState<PriceInfo[] | null>(null)
  const [referral, setReferral] = useState<ReferralInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  const { ref: serversRef, inView: serversInView } = useScrollReveal()
  const { ref: announcementsRef, inView: announcementsInView } = useScrollReveal()

  useEffect(() => {
    let active = true

    async function loadDashboard(): Promise<void> {
      setLoading(true)
      try {
        const [serverResult, announcementResult, priceResult, referralResult] = await Promise.allSettled([
          apiFetch<Server[]>('/api/servers'),
          apiFetch<{ announcements: Announcement[] }>('/api/announcements'),
          apiFetch<PriceInfo[]>('/api/store/prices'),
          apiFetch<ReferralInfo>('/api/referrals/code'),
        ])

        if (!active) return

        const nextWarnings: string[] = []
        const unwrap = <T,>(
          result: PromiseSettledResult<T>,
          fallback: T,
          label: string
        ): T => {
          if (result.status === 'fulfilled') return result.value
          nextWarnings.push(
            `${label}: ${result.reason instanceof Error ? result.reason.message : 'Unable to load data'}`
          )
          return fallback
        }

        const serverList = unwrap(serverResult, [], 'Servers')
        const announcementData = unwrap(announcementResult, { announcements: [] }, 'Announcements')
        const priceList = unwrap(priceResult, null, 'Store prices')
        const referralData = unwrap(referralResult, null, 'Referral')

        setServers(serverList)
        setAnnouncements(announcementData.announcements || [])
        setPrices(priceList)
        setReferral(referralData)
        setError(null)
        setWarnings(nextWarnings)
        await refreshUser()
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard')
          setWarnings([])
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDashboard()
    return () => {
      active = false
    }
  }, [refreshUser])

  if (error) {
    return (
      <div className="stack">
        <Card>
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>Error loading dashboard</h1>
            <p className="hero-text">{error}</p>
          </div>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="stack">
        <Card>
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>Welcome back, {user?.username || 'pilot'}.</h1>
            <p className="hero-text">Loading your dashboard...</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="stack">
      {/* Hero Section */}
      <Card glass>
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Welcome back, {user?.username || 'pilot'}.</h1>
          <p className="hero-text">
            You have{' '}
            <Badge variant="primary" animated>
              {servers.length} server{servers.length !== 1 ? 's' : ''}
            </Badge>{' '}
            and{' '}
            <Badge variant="success" animated>
              {user?.coins || '0'} coins
            </Badge>
          </p>
        </div>
      </Card>

      {/* Warnings */}
      {warnings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {warnings.map((warning, idx) => (
            <Card key={idx}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <Badge variant="warning">⚠️</Badge>
                <span>{warning}</span>
              </div>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Servers & Stats Grid */}
      <motion.div
        ref={serversRef}
        className="dashboard-grid"
        variants={staggerContainerVariants}
        initial="hidden"
        animate={serversInView ? 'visible' : 'hidden'}
      >
        {/* Servers Card */}
        <motion.div variants={staggerItemVariants}>
          <Card>
            <p className="eyebrow">Servers</p>
            <h3>Quick access</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {servers.length > 0 ? (
                servers.map((server) => (
                  <Link
                    key={server.id}
                    to={`/servers/${server.calagopus_uuid}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Button variant="ghost" size="md" style={{ width: '100%', justifyContent: 'flex-start' }}>
                      {server.name}
                      {server.is_suspended && (
                        <Badge variant="danger" size="sm">
                          Suspended
                        </Badge>
                      )}
                    </Button>
                  </Link>
                ))
              ) : (
                <p style={{ color: 'var(--color-neutral-500)' }}>No servers yet</p>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Coins Card */}
        <motion.div variants={staggerItemVariants}>
          <Card>
            <p className="eyebrow">Account</p>
            <h3>Balance</h3>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--color-primary)' }}>
              {user?.coins || 0}
            </div>
            <Link to="/billing">
              <Button variant="primary" size="sm" style={{ marginTop: 'var(--space-md)' }}>
                Top up balance
              </Button>
            </Link>
          </Card>
        </motion.div>

        {/* Referral Card */}
        {referral && (
          <motion.div variants={staggerItemVariants}>
            <Card>
              <p className="eyebrow">Referral</p>
              <h3>Your code</h3>
              <div
                style={{
                  background: 'var(--color-neutral-100)',
                  padding: 'var(--space-md)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-family-mono)',
                  textAlign: 'center',
                  letterSpacing: '0.1em',
                }}
              >
                {referral.code}
              </div>
            </Card>
          </motion.div>
        )}
      </motion.div>

      {/* Announcements Section */}
      {announcements.length > 0 && (
        <motion.div
          ref={announcementsRef}
          variants={staggerContainerVariants}
          initial="hidden"
          animate={announcementsInView ? 'visible' : 'hidden'}
        >
          <p className="eyebrow">News</p>
          <h2>Latest announcements</h2>

          <motion.div
            style={{ display: 'grid', gap: 'var(--space-md)' }}
            variants={staggerContainerVariants}
            initial="hidden"
            animate={announcementsInView ? 'visible' : 'hidden'}
          >
            {announcements.map((announcement, idx) => (
              <motion.div key={announcement.id} variants={staggerItemVariants}>
                <Card>
                  <h4>{announcement.title}</h4>
                  <p style={{ color: 'var(--color-neutral-600)', marginTop: 'var(--space-sm)' }}>
                    {announcement.content}
                  </p>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-400)', marginTop: 'var(--space-md)' }}>
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* Store Prices */}
      {prices && prices.length > 0 && (
        <div>
          <p className="eyebrow">Store</p>
          <h2>Available packages</h2>
          <motion.div
            className="dashboard-grid"
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {prices.map((price) => (
              <motion.div key={price.id} variants={staggerItemVariants}>
                <Card hover>
                  <h3>{price.name}</h3>
                  <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', marginTop: 'var(--space-md)' }}>
                    ${price.price}
                  </div>
                  <Link to="/store" style={{ marginTop: 'var(--space-md)', display: 'inline-block' }}>
                    <Button variant="primary">View details</Button>
                  </Link>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}
    </div>
  )
}

            ))
          ) : (
            <p className="muted">No servers. Create one in the Store.</p>
          )}
        </article>

        <article className="glass-card panel">
          <p className="eyebrow">Account</p>
          <h3>Your stats</h3>
          <div>
            <div className="mini-metric">
              <span>Coins</span>
              <strong>{user?.coins || '0'}</strong>
            </div>
            <div className="mini-metric">
              <span>Servers</span>
              <strong>{servers.length}</strong>
            </div>
            <div className="mini-metric">
              <span>Role</span>
              <strong>{user?.is_admin ? 'Admin' : 'Client'}</strong>
            </div>
          </div>
        </article>
      </section>

      {announcements.length > 0 && (
        <section className="glass-card panel">
          <p className="eyebrow">Latest</p>
          <h3>Announcements</h3>
          {announcements.slice(0, 3).map((announce) => (
            <article key={announce.id} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <strong>{announce.title}</strong>
              <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>{announce.content}</p>
            </article>
          ))}
          <Link to="/announcements" className="button button-ghost">
            View all
          </Link>
        </section>
      )}

      {prices && prices.length > 0 && (
        <section className="glass-card panel">
          <p className="eyebrow">Store</p>
          <h3>Featured upgrades</h3>
          {prices.slice(0, 3).map((price) => (
            <div key={price.id} style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{price.name}</span>
                <strong>{price.price} coins</strong>
              </div>
            </div>
          ))}
          <Link to="/store" className="button button-primary">
            Browse store
          </Link>
        </section>
      )}

      {referral && (
        <section className="glass-card panel">
          <p className="eyebrow">Referral</p>
          <h3>Invite friends</h3>
          <code style={{ display: 'block', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.25rem' }}>
            {referral.code}
          </code>
        </section>
      )}
    </div>
  )
}
