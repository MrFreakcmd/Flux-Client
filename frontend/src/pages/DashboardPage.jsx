import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Terminal from '../components/Terminal'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

function formatCoins(value) {
  return Number.parseFloat(value || 0).toFixed(2)
}

export default function DashboardPage() {
  const { user, refreshUser } = useAuth()
  const [servers, setServers] = useState([])
  const [tickets, setTickets] = useState([])
  const [prices, setPrices] = useState(null)
  const [referral, setReferral] = useState(null)
  const [selectedServerId, setSelectedServerId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      setLoading(true)
      try {
        const [serverList, ticketList, priceList, referralData] = await Promise.all([
          apiFetch('/api/servers'),
          apiFetch('/api/tickets'),
          apiFetch('/api/store/prices'),
          apiFetch('/api/referrals/code'),
        ])

        if (!active) {
          return
        }

        setServers(serverList)
        setTickets(ticketList)
        setPrices(priceList)
        setReferral(referralData)
        setSelectedServerId(serverList[0]?.calagopus_uuid || null)
        setError(null)
        await refreshUser()
      } catch (err) {
        if (active) {
          setError(err.message)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [refreshUser])

  const selectedServer = servers.find((server) => server.calagopus_uuid === selectedServerId) || servers[0] || null

  return (
    <div className="stack">
      <section className="dashboard-hero glass-card">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Welcome back, {user?.username || 'pilot'}.</h1>
          <p className="hero-text">
            Your coin balance, server fleet, and support queue are all visible from here.
          </p>
        </div>

        <div className="hero-meta">
          <div className="mini-metric">
            <span>Coins</span>
            <strong>{formatCoins(user?.coins)}</strong>
          </div>
          <div className="mini-metric">
            <span>Servers</span>
            <strong>{servers.length}</strong>
          </div>
          <div className="mini-metric">
            <span>Tickets</span>
            <strong>{tickets.length}</strong>
          </div>
        </div>
      </section>

      {error ? <div className="glass-card notice error">{error}</div> : null}
      {loading ? <div className="glass-card notice">Loading your workspace...</div> : null}

      <section className="stat-grid">
        {[
          { label: 'CPU limit', value: `${user?.limit_cpu ?? 0}%` },
          { label: 'Memory limit', value: `${user?.limit_memory ?? 0} MB` },
          { label: 'Disk limit', value: `${user?.limit_disk ?? 0} MB` },
          { label: 'Slots', value: `${user?.limit_slots ?? 0}` },
        ].map((item) => (
          <article className="glass-card stat-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Referral</p>
              <h3>Your invite code</h3>
            </div>
            <Link className="button button-ghost" to="/store">
              Buy limits
            </Link>
          </div>
          <div className="code-block">{referral?.code || user?.discord_id || 'loading...'}</div>
          <p className="muted">
            Share this link: <code>{referral?.share_url || 'loading...'}</code>
          </p>
          <div className="prices-grid">
            {prices ? (
              Object.entries(prices).map(([key, value]) => (
                <div className="price-pill" key={key}>
                  <span>{key.replaceAll('_', ' ')}</span>
                  <strong>{String(value)} coins</strong>
                </div>
              ))
            ) : (
              <div className="price-pill">
                <span>Store</span>
                <strong>Loading prices...</strong>
              </div>
            )}
          </div>
        </article>

        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Support</p>
              <h3>Recent tickets</h3>
            </div>
            <Link className="button button-ghost" to="/support">
              Open support
            </Link>
          </div>
          <div className="list-stack">
            {tickets.length ? (
              tickets.map((ticket) => (
                <div className="list-row" key={ticket.id}>
                  <div>
                    <strong>{ticket.subject}</strong>
                    <span>
                      {ticket.department} · {ticket.status}
                    </span>
                  </div>
                  <span className="status-chip neutral">{ticket.messages?.length || 0} msgs</span>
                </div>
              ))
            ) : (
              <p className="muted">No tickets yet. Open support when you need us.</p>
            )}
          </div>
        </article>
      </section>

      <section className="glass-card panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Console</p>
            <h3>Selected server terminal</h3>
          </div>
          <Link className="button button-ghost" to="/servers">
            Manage servers
          </Link>
        </div>
        {selectedServer ? (
          <Terminal serverUuid={selectedServer.calagopus_uuid} title={selectedServer.name} />
        ) : (
          <p className="muted">Provision a server to open the terminal here.</p>
        )}
      </section>
    </div>
  )
}
