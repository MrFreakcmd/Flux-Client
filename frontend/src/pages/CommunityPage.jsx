import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

const categories = ['coins', 'servers', 'rewards']

export default function CommunityPage() {
  const { user, refreshUser } = useAuth()
  const [category, setCategory] = useState('coins')
  const [leaders, setLeaders] = useState([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [profile, setProfile] = useState(null)
  const [giftAmount, setGiftAmount] = useState('1')
  const [message, setMessage] = useState(null)

  async function loadLeaderboard(nextCategory = category) {
    const data = await apiFetch(`/api/community/leaderboard?category=${encodeURIComponent(nextCategory)}`)
    setLeaders(data.leaders || [])
  }

  useEffect(() => {
    loadLeaderboard().catch((err) => setMessage(err.message))
  }, [category])

  async function search(event) {
    event.preventDefault()
    setMessage(null)
    try {
      const data = await apiFetch(`/api/community/search?query=${encodeURIComponent(query)}`)
      setResults(data.users || [])
    } catch (err) {
      setMessage(err.message)
    }
  }

  async function openProfile(id) {
    setMessage(null)
    try {
      const data = await apiFetch(`/api/community/profile/${id}`)
      setProfile(data.profile)
    } catch (err) {
      setMessage(err.message)
    }
  }

  async function sendGift(event) {
    event.preventDefault()
    if (!profile) return
    setMessage(null)
    try {
      const data = await apiFetch('/api/community/gift', {
        method: 'POST',
        body: {
          recipient_id: profile.id,
          amount: Number(giftAmount),
        },
      })
      setMessage(`Gift sent to ${data.recipient.username}.`)
      await refreshUser()
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <div className="stack">
      <section className="dashboard-hero glass-card">
        <div>
          <p className="eyebrow">Community</p>
          <h1>Leaderboards, lookup, and coin gifts.</h1>
          <p className="hero-text">Find other users, inspect public profiles, and send coins safely from your balance.</p>
        </div>
        <div className="mini-metric">
          <span>Your balance</span>
          <strong>{Number(user?.coins || 0).toFixed(2)}</strong>
        </div>
      </section>

      {message ? <div className="glass-card notice">{message}</div> : null}

      <section className="dashboard-grid">
        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Leaderboard</p>
              <h3>Top users</h3>
            </div>
            <div className="button-row tight">
              {categories.map((item) => (
                <button
                  className={`button button-ghost${category === item ? ' is-active' : ''}`}
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="list-stack">
            {leaders.map((entry) => (
              <button className="list-row selectable" key={entry.user.id} type="button" onClick={() => openProfile(entry.user.id)}>
                <div>
                  <strong>#{entry.rank} {entry.user.username}</strong>
                  <span>{entry.user.server_count} servers - {entry.user.reward_count} rewards</span>
                </div>
                <span className="status-chip neutral">{entry.score}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Lookup</p>
              <h3>Find a user</h3>
            </div>
          </div>
          <form className="terminal-input-row" onSubmit={search}>
            <input className="input terminal-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Username, email, or Discord ID" />
            <button className="button button-primary" type="submit">Search</button>
          </form>
          <div className="list-stack spacious">
            {results.map((result) => (
              <button className="list-row selectable" key={result.id} type="button" onClick={() => openProfile(result.id)}>
                <div>
                  <strong>{result.username}</strong>
                  <span>{result.discord_id}</span>
                </div>
                <span className="status-chip neutral">{result.coins} coins</span>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="glass-card panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Profile</p>
            <h3>{profile ? profile.username : 'Select a user'}</h3>
          </div>
          {profile ? <span className="status-chip neutral">{profile.server_count} servers</span> : null}
        </div>
        {profile ? (
          <div className="dashboard-grid">
            <div className="profile-card large">
              {profile.avatar ? <img src={profile.avatar} alt="" /> : <div className="avatar-fallback">{profile.username?.[0] || 'U'}</div>}
              <div>
                <strong>{profile.username}</strong>
                <span>{profile.discord_id}</span>
              </div>
            </div>
            <form className="form-grid" onSubmit={sendGift}>
              <label className="field">
                <span>Gift amount</span>
                <input className="input" type="number" min="1" step="0.01" value={giftAmount} onChange={(event) => setGiftAmount(event.target.value)} disabled={profile.id === user?.id} />
              </label>
              <button className="button button-primary" type="submit" disabled={profile.id === user?.id}>
                {profile.id === user?.id ? 'This is you' : 'Send gift'}
              </button>
            </form>
          </div>
        ) : (
          <p className="muted">Choose a leaderboard entry or search result to inspect their profile.</p>
        )}
      </section>
    </div>
  )
}
