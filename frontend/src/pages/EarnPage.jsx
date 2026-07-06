import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

export default function EarnPage() {
  const { user, refreshUser } = useAuth()
  const [summary, setSummary] = useState(null)
  const [referral, setReferral] = useState(null)
  const [redeemCode, setRedeemCode] = useState('')
  const [afkActive, setAfkActive] = useState(false)
  const [afkLog, setAfkLog] = useState([])
  const [message, setMessage] = useState(null)
  const intervalRef = useRef(null)

  async function loadEarn() {
    const [summaryData, referralData] = await Promise.all([
      apiFetch('/api/earn/summary'),
      apiFetch('/api/referrals/code'),
    ])
    setSummary(summaryData)
    setReferral(referralData)
  }

  useEffect(() => {
    loadEarn().catch((err) => setMessage(err.message))
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  async function heartbeat() {
    const data = await apiFetch('/api/afk/heartbeat', { method: 'POST' })
    setAfkLog((current) => [data, ...current].slice(0, 8))
    await refreshUser()
    return data
  }

  async function toggleAfk() {
    setMessage(null)
    if (afkActive) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      setAfkActive(false)
      setMessage('AFK session stopped.')
      return
    }

    try {
      await heartbeat()
      intervalRef.current = setInterval(() => {
        heartbeat().catch((err) => setMessage(err.message))
      }, 60000)
      setAfkActive(true)
      setMessage('AFK session started. Keep this tab open.')
    } catch (err) {
      setMessage(err.message)
    }
  }

  async function redeem(event) {
    event.preventDefault()
    setMessage(null)
    try {
      const data = await apiFetch('/api/earn/redeem', {
        method: 'POST',
        body: { code: redeemCode },
      })
      setMessage(`Code redeemed for ${data.reward} coins.`)
      setRedeemCode('')
      await Promise.all([refreshUser(), loadEarn()])
    } catch (err) {
      setMessage(err.message)
    }
  }

  async function claimJoinReward() {
    setMessage(null)
    try {
      const data = await apiFetch('/api/earn/join', { method: 'POST' })
      setMessage(`Join reward claimed: ${data.reward} coins.`)
      await Promise.all([refreshUser(), loadEarn()])
    } catch (err) {
      setMessage(err.message)
    }
  }

  async function claimLinkReward(provider) {
    setMessage(null)
    try {
      const data = await apiFetch(`/api/earn/links/${provider}`, { method: 'POST' })
      setMessage(`${provider} reward claimed: ${data.reward} coins.`)
      await Promise.all([refreshUser(), loadEarn()])
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <div className="stack">
      <section className="dashboard-hero glass-card">
        <div>
          <p className="eyebrow">Earn</p>
          <h1>Grow your balance without leaving Flux.</h1>
          <p className="hero-text">AFK rewards, referral links, redeem codes, join rewards, and link rewards live here.</p>
        </div>
        <div className="mini-metric">
          <span>Current coins</span>
          <strong>{Number(user?.coins || 0).toFixed(2)}</strong>
        </div>
      </section>

      {message ? <div className="glass-card notice">{message}</div> : null}

      <section className="dashboard-grid">
        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">AFK</p>
              <h3>Heartbeat rewards</h3>
            </div>
            <span className={`status-chip ${afkActive ? 'online' : 'neutral'}`}>{afkActive ? 'Running' : 'Stopped'}</span>
          </div>
          <p className="muted">Start a session and keep the tab open. The backend validates timing, so refreshing too fast will not grant coins.</p>
          <button className="button button-primary" type="button" onClick={toggleAfk}>
            {afkActive ? 'Stop AFK session' : 'Start AFK session'}
          </button>
          <div className="list-stack spacious">
            {afkLog.map((entry, index) => (
              <div className="list-row" key={`${entry.message}-${index}`}>
                <div>
                  <strong>{entry.credited ? `+${entry.reward} coins` : 'No credit'}</strong>
                  <span>{entry.message}</span>
                </div>
                <span className="status-chip neutral">{entry.next_eligible_in ?? 0}s</span>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Redeem</p>
              <h3>Use a reward code</h3>
            </div>
          </div>
          <form className="terminal-input-row" onSubmit={redeem}>
            <input className="input terminal-input" value={redeemCode} onChange={(event) => setRedeemCode(event.target.value)} placeholder="Enter code" />
            <button className="button button-primary" type="submit">Redeem</button>
          </form>
          <p className="muted">Codes are created by admins directly in the database or future admin tooling.</p>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Referrals</p>
              <h3>Your invite link</h3>
            </div>
          </div>
          <div className="code-block">{referral?.share_url || 'Loading...'}</div>
          <p className="muted">Code: {referral?.code || 'loading'}</p>
        </article>

        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Join</p>
              <h3>Discord reward</h3>
            </div>
            <span className={`status-chip ${summary?.join_reward?.enabled ? 'online' : 'neutral'}`}>
              {summary?.join_reward?.enabled ? 'Configured' : 'Disabled'}
            </span>
          </div>
          <p className="muted">Claim this after joining the configured Discord guild.</p>
          <button className="button button-primary" type="button" onClick={claimJoinReward} disabled={!summary?.join_reward?.enabled || summary?.join_reward?.claimed}>
            {summary?.join_reward?.claimed ? 'Already claimed' : `Claim ${summary?.join_reward?.coins || 0} coins`}
          </button>
        </article>
      </section>

      <section className="glass-card panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Links</p>
            <h3>Configured link rewards</h3>
          </div>
        </div>
        <div className="server-grid">
          {(summary?.link_rewards || []).map((reward) => (
            <article className="glass-card server-card" key={reward.provider}>
              <div className="server-card-top">
                <div>
                  <p className="eyebrow">Provider</p>
                  <h3>{reward.provider}</h3>
                </div>
                <span className="status-chip neutral">{reward.coins} coins</span>
              </div>
              <button className="button button-primary" type="button" onClick={() => claimLinkReward(reward.provider)} disabled={reward.claimed}>
                {reward.claimed ? 'Claimed' : 'Claim reward'}
              </button>
            </article>
          ))}
          {!(summary?.link_rewards || []).length ? <p className="muted">No link reward providers are configured yet.</p> : null}
        </div>
      </section>
    </div>
  )
}
