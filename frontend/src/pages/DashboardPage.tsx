import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'
import { Card, Badge, Button, PageHeader } from '../components'
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
        <PageHeader
          title="Dashboard"
          subtitle="Error loading dashboard"
        />
        <Card variant="elevated">
          <div>
            <p>{error}</p>
          </div>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="stack">
        <PageHeader
          title="Dashboard"
          subtitle="Loading your dashboard..."
        />
        <Card variant="elevated">
          <div>
            <p>Loading...</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="stack">
      {/* Page Header */}
      <PageHeader
        title={`Welcome back, ${user?.username || 'pilot'}`}
        subtitle="Overview of your account and servers"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard' }
        ]}
      />

      {/* Hero Section with Stats */}
      <Card variant="glass">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', margin: 0 }}>
              Account Overview
            </p>
            <h2 style={{ margin: '0.5rem 0 0 0' }}>Quick stats</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-md)' }}>
            <div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', margin: 0 }}>Servers</p>
              <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                {servers.length}
              </div>
            </div>
            <div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', margin: 0 }}>Balance</p>
              <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--color-success)' }}>
                {user?.coins || 0}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Warnings */}
      {warnings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}
        >
          {warnings.map((warning, idx) => (
            <Card key={idx} variant="elevated">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <Badge variant="warning" status="busy">⚠️</Badge>
                <span>{warning}</span>
              </div>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Servers & Stats Grid */}
      <motion.div
        ref={serversRef}
        className="content-grid two-column"
        variants={staggerContainerVariants}
        initial="hidden"
        animate={serversInView ? 'visible' : 'hidden'}
      >
        {/* Servers Card */}
        <motion.div variants={staggerItemVariants}>
          <Card variant="default">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div>
                <h3 style={{ margin: 0, marginBottom: 'var(--space-sm)' }}>Servers</h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', margin: 0 }}>
                  Quick access to your servers
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {servers.length > 0 ? (
                  servers.map((server) => (
                    <Link
                      key={server.id}
                      to={`/servers/${server.calagopus_uuid}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <Button variant="ghost" fullWidth>
                        <span style={{ flex: 1, textAlign: 'left' }}>{server.name}</span>
                        {server.is_suspended && (
                          <Badge variant="danger" size="sm" dot>
                            Suspended
                          </Badge>
                        )}
                      </Button>
                    </Link>
                  ))
                ) : (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-md) 0' }}>
                    No servers yet. Create one to get started.
                  </p>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Account Card */}
        <motion.div variants={staggerItemVariants}>
          <Card variant="default">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', justifyContent: 'space-between', height: '100%' }}>
              <div>
                <h3 style={{ margin: 0, marginBottom: 'var(--space-sm)' }}>Balance</h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', margin: 0 }}>
                  Account balance
                </p>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'bold', color: 'var(--color-primary)', marginBottom: 'var(--space-md)' }}>
                  {user?.coins || 0}
                </div>
                <Link to="/billing" style={{ display: 'block' }}>
                  <Button variant="primary" fullWidth>
                    Top up balance
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Referral Card */}
        {referral && (
          <motion.div variants={staggerItemVariants}>
            <Card variant="default">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div>
                  <h3 style={{ margin: 0, marginBottom: 'var(--space-sm)' }}>Referral</h3>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', margin: 0 }}>
                    Share your code
                  </p>
                </div>
                <div
                  style={{
                    background: 'var(--bg-tertiary)',
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-lg)',
                    fontFamily: 'var(--font-family-mono)',
                    textAlign: 'center',
                    letterSpacing: '0.1em',
                    border: '1px solid var(--border-color)',
                    userSelect: 'all',
                    cursor: 'pointer'
                  }}
                >
                  {referral.code}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </motion.div>

      {/* Announcements Section */}
      {announcements.length > 0 && (
        <motion.div
          ref={announcementsRef}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}
          variants={staggerContainerVariants}
          initial="hidden"
          animate={announcementsInView ? 'visible' : 'hidden'}
        >
          <div>
            <h2 style={{ margin: 0, marginBottom: 'var(--space-sm)' }}>Latest announcements</h2>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', margin: 0 }}>
              News and updates
            </p>
          </div>

          <motion.div
            className="content-grid"
            variants={staggerContainerVariants}
            initial="hidden"
            animate={announcementsInView ? 'visible' : 'hidden'}
          >
            {announcements.map((announcement) => (
              <motion.div key={announcement.id} variants={staggerItemVariants}>
                <Card variant="default">
                  <h4 style={{ margin: 0, marginBottom: 'var(--space-sm)' }}>{announcement.title}</h4>
                  <p style={{ color: 'var(--text-secondary)', margin: '0 0 var(--space-md) 0', lineHeight: 'var(--line-height-normal)' }}>
                    {announcement.content}
                  </p>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', margin: 0 }}>
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
        <motion.div
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}
          variants={staggerContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div>
            <h2 style={{ margin: 0, marginBottom: 'var(--space-sm)' }}>Available packages</h2>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', margin: 0 }}>
              Upgrade your account
            </p>
          </div>
          <motion.div
            className="content-grid three-column"
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {prices.map((price) => (
              <motion.div key={price.id} variants={staggerItemVariants}>
                <Card variant="elevated" hover>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', height: '100%' }}>
                    <div>
                      <h3 style={{ margin: 0 }}>{price.name}</h3>
                      <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--color-primary)', marginTop: 'var(--space-md)' }}>
                        ${price.price}
                      </div>
                    </div>
                    <Link to="/store" style={{ marginTop: 'auto', display: 'block' }}>
                      <Button variant="primary" fullWidth>
                        View details
                      </Button>
                    </Link>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
