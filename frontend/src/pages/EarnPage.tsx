import { useEffect, useRef, useState, FormEvent, ChangeEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

interface EarnSummary {
  balance: string
  join_reward: { enabled: boolean; coins: number; claimed: boolean }
  link_rewards: Array<{ provider: string; coins: number; claimed: boolean }>
  claimed_rewards: Array<{ type: string; provider: string; reward: string; completed_at: string }>
}

interface ReferralInfo {
  code: string
  reward: number
  referred_count: number
}

interface HeartbeatData {
  id: string
  reward: number
  timestamp: string
}

export default function EarnPage() {
  const { user, refreshUser } = useAuth()
  const [summary, setSummary] = useState<EarnSummary | null>(null)
  const [referral, setReferral] = useState<ReferralInfo | null>(null)
  const [redeemCode, setRedeemCode] = useState<string>('')
  const [afkActive, setAfkActive] = useState<boolean>(false)
  const [afkLog, setAfkLog] = useState<HeartbeatData[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  async function loadEarn(): Promise<void> {
    try {
      const [summaryData, referralData] = await Promise.all([
        apiFetch<EarnSummary>('/api/earn/summary'),
        apiFetch<ReferralInfo>('/api/referrals/code'),
      ])
      setSummary(summaryData)
      setReferral(referralData)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load earn data')
    }
  }

  useEffect(() => {
    loadEarn()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  async function heartbeat(): Promise<HeartbeatData> {
    const data = await apiFetch<HeartbeatData>('/api/afk/heartbeat', { method: 'POST' })
    setAfkLog((current) => [data, ...current].slice(0, 8))
    await refreshUser()
    return data
  }

  async function toggleAfk(): Promise<void> {
    setMessage(null)
    if (afkActive) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      setAfkActive(false)
      setMessage('AFK session stopped.')
      return
    }

    try {
      await heartbeat()
      intervalRef.current = setInterval(() => {
        heartbeat().catch((err) => setMessage(err instanceof Error ? err.message : 'Heartbeat failed'))
      }, 60000)
      setAfkActive(true)
      setMessage('AFK session started. Keep this tab open.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to start AFK')
    }
  }

  async function redeem(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setMessage(null)
    try {
      const data = await apiFetch<{ reward: number }>('/api/earn/redeem', {
        method: 'POST',
        body: { code: redeemCode },
      })
      setMessage(`Code redeemed for ${data.reward} coins.`)
      setRedeemCode('')
      await Promise.all([refreshUser(), loadEarn()])
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Redemption failed')
    }
  }

  async function claimJoinReward(): Promise<void> {
    setMessage(null)
    try {
      const data = await apiFetch<{ reward: number }>('/api/earn/join', { method: 'POST' })
      setMessage(`Join reward claimed: ${data.reward} coins.`)
      await Promise.all([refreshUser(), loadEarn()])
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to claim reward')
    }
  }

  async function claimLinkReward(provider: string): Promise<void> {
    setMessage(null)
    try {
      const data = await apiFetch<{ reward: number }>(`/api/earn/links/${provider}`, { method: 'POST' })
      setMessage(`${provider} reward claimed: ${data.reward} coins.`)
      await Promise.all([refreshUser(), loadEarn()])
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to claim reward')
    }
  }

  return (
    <div className="stack">
      <section className="dashboard-hero glass-card">
        <div>
          <p className="eyebrow">Earn</p>
          <h1>Ways to earn coins.</h1>
          <p className="hero-text">AFK rewards, referrals, link rewards, and redeem codes.</p>
        </div>
      </section>

      {message && <div className="glass-card notice">{message}</div>}

      <section className="dashboard-grid">
        <article className="glass-card panel">
          <h3>AFK Rewards</h3>
          <p>Earn {summary?.join_reward.coins || 0} coins per heartbeat</p>
          <button onClick={toggleAfk} className={`button ${afkActive ? 'button-danger' : 'button-primary'}`}>
            {afkActive ? 'Stop AFK' : 'Start AFK'}
          </button>
        </article>

        <article className="glass-card panel">
          <h3>Redeem Code</h3>
          <form onSubmit={redeem}>
            <input
              value={redeemCode}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setRedeemCode(e.target.value)}
              placeholder="Enter code"
              className="input"
            />
            <button type="submit" className="button button-primary">
              Redeem
            </button>
          </form>
        </article>
      </section>

      {summary?.join_reward.enabled && (
        <article className="glass-card panel">
          <h3>Join Reward</h3>
          <button
            onClick={claimJoinReward}
            disabled={summary.join_reward.claimed}
            className="button button-primary"
          >
            {summary.join_reward.claimed ? 'Already Claimed' : 'Claim Reward'}
          </button>
        </article>
      )}

      {summary?.link_rewards && summary.link_rewards.length > 0 && (
        <article className="glass-card panel">
          <h3>Link Rewards</h3>
          {summary.link_rewards.map((reward) => (
            <button
              key={reward.provider}
              onClick={() => claimLinkReward(reward.provider)}
              disabled={reward.claimed}
              className="button button-secondary"
              style={{ marginBottom: '0.5rem' }}
            >
              {reward.provider}: {reward.claimed ? 'Claimed' : `+${reward.coins} coins`}
            </button>
          ))}
        </article>
      )}

      {referral && (
        <article className="glass-card panel">
          <h3>Referral</h3>
          <p>Your code: <strong>{referral.code}</strong></p>
          <p>Referred users: {referral.referred_count}</p>
          <p>Reward per referral: {referral.reward} coins</p>
        </article>
      )}
    </div>
  )
}
