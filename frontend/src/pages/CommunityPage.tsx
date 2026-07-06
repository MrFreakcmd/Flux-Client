import { useEffect, useState, FormEvent, ChangeEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

interface LeaderboardUser {
  id: string
  username: string
  value: string
  rank: number
}

interface UserProfile {
  id: string
  username: string
  avatar: string | null
  coins: string
  servers_count: number
}

interface SearchUser {
  id: string
  username: string
  avatar: string | null
}

const categories = ['coins', 'servers', 'rewards']

export default function CommunityPage() {
  const { user, refreshUser } = useAuth()
  const [category, setCategory] = useState<string>('coins')
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([])
  const [query, setQuery] = useState<string>('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [giftAmount, setGiftAmount] = useState<string>('1')
  const [message, setMessage] = useState<string | null>(null)

  async function loadLeaderboard(nextCategory: string = category): Promise<void> {
    try {
      const data = await apiFetch<{ leaders: LeaderboardUser[] }>(
        `/api/community/leaderboard?category=${encodeURIComponent(nextCategory)}`
      )
      setLeaders(data.leaders || [])
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load leaderboard')
    }
  }

  useEffect(() => {
    loadLeaderboard()
  }, [category])

  async function search(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setMessage(null)
    try {
      const data = await apiFetch<{ users: SearchUser[] }>(
        `/api/community/search?query=${encodeURIComponent(query)}`
      )
      setResults(data.users || [])
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Search failed')
    }
  }

  async function openProfile(id: string): Promise<void> {
    setMessage(null)
    try {
      const data = await apiFetch<{ profile: UserProfile }>(`/api/community/profile/${id}`)
      setProfile(data.profile)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load profile')
    }
  }

  async function sendGift(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!profile) return
    setMessage(null)
    try {
      const data = await apiFetch<{ recipient: { username: string } }>('/api/community/gift', {
        method: 'POST',
        body: {
          recipient_id: profile.id,
          amount: Number(giftAmount),
        },
      })
      setMessage(`Gift sent to ${data.recipient.username}.`)
      await refreshUser()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to send gift')
    }
  }

  return (
    <div className="stack">
      <section className="dashboard-hero glass-card">
        <div>
          <p className="eyebrow">Community</p>
          <h1>Connect with other players.</h1>
          <p className="hero-text">View leaderboards, find players, and send gifts.</p>
        </div>
      </section>

      {message && <div className="glass-card notice">{message}</div>}

      <section className="dashboard-grid">
        <article className="glass-card panel">
          <h3>Leaderboard</h3>
          <select value={category} onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)}>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
          <div>
            {leaders.map((leader) => (
              <div key={leader.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  {leader.rank}. {leader.username}
                </span>
                <strong>{leader.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card panel">
          <h3>Search Players</h3>
          <form onSubmit={search}>
            <input
              type="text"
              value={query}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              placeholder="Search username"
            />
            <button type="submit" className="button button-primary">
              Search
            </button>
          </form>
          <div>
            {results.map((result) => (
              <div key={result.id} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <span>{result.username}</span>
                <button
                  onClick={() => openProfile(result.id)}
                  className="button button-ghost button-sm"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </article>
      </section>

      {profile && (
        <section className="glass-card">
          <h3>{profile.username}</h3>
          <p>Coins: {profile.coins}</p>
          <p>Servers: {profile.servers_count}</p>
          <form onSubmit={sendGift}>
            <input
              type="number"
              value={giftAmount}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setGiftAmount(e.target.value)}
              min="1"
            />
            <button type="submit" className="button button-primary">
              Send Gift
            </button>
          </form>
        </section>
      )}
    </div>
  )
}
