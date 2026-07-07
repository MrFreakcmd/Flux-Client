import { useEffect, useRef, useState, FormEvent, ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'
import { Card, Badge, Button, Input, PageTransition } from '../components'
import { useScrollReveal, staggerContainerVariants, staggerItemVariants } from '../hooks'
import styles from './EarnPage.module.css'

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
  const [loading, setLoading] = useState(true)
  const [afkLoading, setAfkLoading] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const { ref: rewardsRef, inView: rewardsInView } = useScrollReveal()
  const { ref: referralRef, inView: referralInView } = useScrollReveal()

  async function loadEarn(): Promise<void> {
    try {
      const [summaryData, referralData] = await Promise.all([
        apiFetch<EarnSummary>('/api/earn/summary'),
        apiFetch<ReferralInfo>('/api/referrals/code'),
      ])
      setSummary(summaryData)
      setReferral(referralData)
      setMessage(null)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load earn data')
    } finally {
      setLoading(false)
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
    setAfkLoading(true)

    try {
      if (afkActive) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = null
        setAfkActive(false)
        setMessage('AFK session stopped.')
      } else {
        await heartbeat()
        intervalRef.current = setInterval(() => {
          heartbeat().catch((err) => setMessage(err instanceof Error ? err.message : 'Heartbeat failed'))
        }, 60000)
        setAfkActive(true)
        setMessage('AFK session started. Keep this tab open.')
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : afkActive ? 'Failed to stop AFK' : 'Failed to start AFK')
      setAfkActive(false)
    } finally {
      setAfkLoading(false)
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
            <p className={styles.eyebrow}>Earn</p>
            <h1>Ways to earn coins</h1>
            <p className={styles.heroText}>
              AFK rewards, referrals, link rewards, and redeem codes.
            </p>
          </div>
        </motion.section>

        {/* Messages */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <div className={message.includes('failed') || message.includes('Failed') ? styles.errorCard : styles.successCard}>
                <p className={styles.messageText}>{message}</p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Primary Actions Grid */}
        <motion.section
          ref={rewardsRef}
          className={styles.primaryGrid}
          variants={staggerContainerVariants}
          initial="hidden"
          animate={rewardsInView ? "visible" : "hidden"}
        >
          {/* AFK Rewards */}
          <motion.div variants={staggerItemVariants}>
            <Card glass hover>
              <div className={styles.actionCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.label}>Active Earning</p>
                    <h3>AFK Rewards</h3>
                  </div>
                  {afkActive && <Badge variant="success">Active</Badge>}
                </div>

                <div className={styles.cardContent}>
                  <p className={styles.description}>
                    Earn {summary?.join_reward.coins || 0} coins per heartbeat while you keep the tab open.
                  </p>

                  <Button
                    onClick={toggleAfk}
                    variant={afkActive ? 'danger' : 'primary'}
                    size="md"
                    isLoading={afkLoading}
                    className={styles.actionButton}
                  >
                    {afkActive ? 'Stop AFK Session' : 'Start AFK Session'}
                  </Button>

                  {afkLog.length > 0 && (
                    <div className={styles.afkLog}>
                      <p className={styles.logLabel}>Recent heartbeats</p>
                      <div className={styles.logItems}>
                        {afkLog.slice(0, 3).map((beat, idx) => (
                          <motion.div
                            key={beat.id}
                            className={styles.logItem}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                          >
                            <span>+{beat.reward} coins</span>
                            <span className={styles.timestamp}>
                              {new Date(beat.timestamp).toLocaleTimeString()}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Redeem Code */}
          <motion.div variants={staggerItemVariants}>
            <Card glass hover>
              <div className={styles.actionCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.label}>One-Time</p>
                    <h3>Redeem Code</h3>
                  </div>
                </div>

                <div className={styles.cardContent}>
                  <form onSubmit={redeem} className={styles.form}>
                    <Input
                      type="text"
                      placeholder="Enter redemption code"
                      value={redeemCode}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setRedeemCode(e.target.value)}
                      required
                    />
                    <Button type="submit" variant="primary" size="md" className={styles.submitButton}>
                      Redeem
                    </Button>
                  </form>
                  <p className={styles.hint}>Enter a valid code to claim bonus coins.</p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Join Reward */}
          {summary?.join_reward.enabled && (
            <motion.div variants={staggerItemVariants}>
              <Card glass hover>
                <div className={styles.actionCard}>
                  <div className={styles.cardHeader}>
                    <div>
                      <p className={styles.label}>Welcome</p>
                      <h3>Join Reward</h3>
                    </div>
                    {summary.join_reward.claimed && <Badge variant="success">Claimed</Badge>}
                  </div>

                  <div className={styles.cardContent}>
                    <p className={styles.description}>
                      Get {summary.join_reward.coins} bonus coins just for joining.
                    </p>
                    <Button
                      onClick={claimJoinReward}
                      disabled={summary.join_reward.claimed}
                      variant={summary.join_reward.claimed ? 'secondary' : 'success'}
                      size="md"
                      className={styles.actionButton}
                    >
                      {summary.join_reward.claimed ? 'Already Claimed' : `Claim ${summary.join_reward.coins} Coins`}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </motion.section>

        {/* Link Rewards */}
        {summary?.link_rewards && summary.link_rewards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card glass>
              <div className={styles.rewardsSection}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.label}>Social</p>
                    <h3>Link Rewards</h3>
                  </div>
                  <Badge variant="primary">{summary.link_rewards.length} available</Badge>
                </div>

                <div className={styles.linkGrid}>
                  {summary.link_rewards.map((reward, idx) => (
                    <motion.div
                      key={reward.provider}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <Button
                        onClick={() => claimLinkReward(reward.provider)}
                        disabled={reward.claimed}
                        variant={reward.claimed ? 'secondary' : 'primary'}
                        size="md"
                        className={styles.linkButton}
                      >
                        <div className={styles.linkButtonContent}>
                          <span>{reward.provider}</span>
                          <span className={styles.rewardAmount}>
                            {reward.claimed ? 'Claimed' : `+${reward.coins}`}
                          </span>
                        </div>
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Referral Info */}
        {referral && (
          <motion.div
            ref={referralRef}
            initial={{ opacity: 0, y: 20 }}
            animate={referralInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
          >
            <Card glass>
              <div className={styles.referralCard}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.label}>Multiplier</p>
                    <h3>Your Referral Code</h3>
                  </div>
                </div>

                <div className={styles.referralContent}>
                  <div className={styles.codeBlock}>
                    <code>{referral.code}</code>
                  </div>

                  <div className={styles.referralStats}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Referred Users</span>
                      <span className={styles.statValue}>{referral.referred_count}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Reward per Referral</span>
                      <span className={styles.statValue}>{referral.reward} coins</span>
                    </div>
                  </div>

                  <p className={styles.hint}>
                    Share your code with friends. You both earn coins when they join.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </PageTransition>
  )
}
