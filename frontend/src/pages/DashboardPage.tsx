import { useEffect, useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

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
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

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
        setSelectedServerId(serverList[0]?.calagopus_uuid || null)
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
        <section className="dashboard-hero glass-card">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>Error loading dashboard</h1>
            <p className="hero-text">{error}</p>
          </div>
        </section>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="stack">
        <section className="dashboard-hero glass-card">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>Welcome back, {user?.username || 'pilot'}.</h1>
            <p className="hero-text">Loading your dashboard...</p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="stack">
      <section className="dashboard-hero glass-card">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Welcome back, {user?.username || 'pilot'}.</h1>
          <p className="hero-text">You have {servers.length} server(s) and {user?.coins || '0'} coins.</p>
        </div>
      </section>

      {warnings.map((warning, idx) => (
        <div key={idx} className="glass-card notice warning">
          {warning}
        </div>
      ))}

      <section className="dashboard-grid">
        <article className="glass-card panel">
          <p className="eyebrow">Servers</p>
          <h3>Quick access</h3>
          {servers.length > 0 ? (
            servers.map((server) => (
              <Link key={server.id} to={`/servers/${server.calagopus_uuid}`} className="button button-ghost">
                {server.name}
              </Link>
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
