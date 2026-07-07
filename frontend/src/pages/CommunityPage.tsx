import { useEffect, useState, FormEvent, ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'
import { Button, Card, Input, Badge, PageTransition } from '../components'
import { useScrollReveal, staggerContainerVariants, staggerItemVariants } from '../hooks'
import { useAriaLive } from '../hooks/useA11y'
import styles from './CommunityPage.module.css'

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

const categories = [
  { value: 'coins', label: 'Coins' },
  { value: 'servers', label: 'Servers' },
  { value: 'rewards', label: 'Rewards' },
]

export default function CommunityPage() {
  const { user, refreshUser } = useAuth()
  const [category, setCategory] = useState<string>('coins')
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([])
  const [query, setQuery] = useState<string>('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [giftAmount, setGiftAmount] = useState<string>('1')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { ref: leaderboardRef, inView: leaderboardInView } = useScrollReveal()
  const { announcerRef, announce } = useAriaLive()

  async function loadLeaderboard(nextCategory: string = category): Promise<void> {
    setLoading(true)
    try {
      const data = await apiFetch<{ leaders: LeaderboardUser[] }>(
        `/api/community/leaderboard?category=${encodeURIComponent(nextCategory)}`
      )
      setLeaders(data.leaders || [])
      announce(`${(data.leaders || []).length} players loaded for ${nextCategory} leaderboard`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load leaderboard'
      setMessage(msg)
      announce(msg, 'assertive')
    } finally {
      setLoading(false)
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
      announce(`Found ${(data.users || []).length} players`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed'
      setMessage(msg)
      announce(msg, 'assertive')
    }
  }

  async function openProfile(id: string): Promise<void> {
    setMessage(null)
    try {
      const data = await apiFetch<{ profile: UserProfile }>(`/api/community/profile/${id}`)
      setProfile(data.profile)
      announce(`Profile loaded for ${data.profile.username}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load profile'
      setMessage(msg)
      announce(msg, 'assertive')
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
      const msg = `Gift sent to ${data.recipient.username}.`
      setMessage(msg)
      announce(msg)
      await refreshUser()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send gift'
      setMessage(msg)
      announce(msg, 'assertive')
    }
  }

  return (
    <PageTransition>
      <main className={styles.communityPage}>
        <div ref={announcerRef} aria-live="polite" aria-atomic="true" style={{ display: 'none' }} />

        {/* Hero */}
        <motion.section
          className={styles.hero}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1>Connect with other players.</h1>
            <p>View leaderboards, find players, and send gifts.</p>
          </div>
        </motion.section>

        {/* Message */}
        {message && (
          <motion.div
            className={styles.messageBanner}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            role={message.includes('failed') ? 'alert' : 'status'}
          >
            {message.includes('failed') ? '⚠️' : '✓'} {message}
          </motion.div>
        )}

        {/* Leaderboard & Search */}
        <motion.div
          className={styles.gridSection}
          ref={leaderboardRef}
          initial="hidden"
          animate={leaderboardInView ? 'visible' : 'hidden'}
          variants={staggerContainerVariants}
        >
          {/* Leaderboard */}
          <motion.div variants={staggerItemVariants}>
            <Card className={styles.card}>
              <h2>Leaderboard</h2>
              <div className={styles.categorySelect}>
                <label htmlFor="category">Category:</label>
                <select
                  id="category"
                  value={category}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)}
                  className={styles.select}
                  disabled={loading}
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {loading ? (
                <div className={styles.loadingState}>
                  <div className={styles.spinner} />
                  <p>Loading leaderboard...</p>
                </div>
              ) : (
                <div className={styles.leaderboardList}>
                  {leaders.map((leader) => (
                    <div key={leader.id} className={styles.leaderboardRow}>
                      <div className={styles.rankBadge}>{leader.rank}</div>
                      <span className={styles.username}>{leader.username}</span>
                      <strong className={styles.value}>{leader.value}</strong>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Search */}
          <motion.div variants={staggerItemVariants}>
            <Card className={styles.card}>
              <h2>Search Players</h2>
              <form onSubmit={search} className={styles.searchForm}>
                <Input
                  type="text"
                  value={query}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                  placeholder="Search username"
                  aria-label="Search players by username"
                />
                <Button type="submit" variant="primary">
                  Search
                </Button>
              </form>

              {results.length > 0 && (
                <div className={styles.searchResults}>
                  {results.map((result) => (
                    <div key={result.id} className={styles.searchRow}>
                      {result.avatar && (
                        <img src={result.avatar} alt={result.username} className={styles.avatar} />
                      )}
                      <span className={styles.username}>{result.username}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openProfile(result.id)}
                        aria-label={`View ${result.username}'s profile`}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </motion.div>

        {/* Profile */}
        {profile && (
          <motion.section
            className={styles.profileSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className={styles.profileCard}>
              <div className={styles.profileHeader}>
                {profile.avatar && (
                  <img src={profile.avatar} alt={profile.username} className={styles.profileAvatar} />
                )}
                <div>
                  <h2>{profile.username}</h2>
                  <div className={styles.profileStats}>
                    <Badge variant="primary">{profile.coins} coins</Badge>
                    <Badge variant="secondary">{profile.servers_count} servers</Badge>
                  </div>
                </div>
              </div>

              <form onSubmit={sendGift} className={styles.giftForm}>
                <label htmlFor="giftAmount">Send Gift Amount:</label>
                <div className={styles.giftInputGroup}>
                  <Input
                    id="giftAmount"
                    type="number"
                    value={giftAmount}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setGiftAmount(e.target.value)}
                    min="1"
                    aria-label="Gift amount in coins"
                  />
                  <Button type="submit" variant="success">
                    Send Gift
                  </Button>
                </div>
              </form>

              <Button
                variant="ghost"
                onClick={() => setProfile(null)}
                aria-label="Close profile"
              >
                Close
              </Button>
            </Card>
          </motion.section>
        )}
      </main>
    </PageTransition>
  )
}
