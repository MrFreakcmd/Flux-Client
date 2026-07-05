import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiFetch } from '../lib/api'

const defaultForm = {
  amount: '50',
  currency: 'BDT',
  product_category: 'top up',
  description: 'Wallet top up',
}

export default function BillingPage() {
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState(defaultForm)
  const [message, setMessage] = useState(null)
  const [session, setSession] = useState(null)

  useEffect(() => {
    const status = searchParams.get('status')
    const tranId = searchParams.get('tran_id')
    if (status) {
      setMessage(`Payment ${status}${tranId ? ` for ${tranId}` : ''}.`)
    }
  }, [searchParams])

  async function initiatePayment(event) {
    event.preventDefault()
    setMessage(null)

    try {
      const result = await apiFetch('/api/billing/initiate', {
        method: 'POST',
        body: {
          ...form,
          amount: Number(form.amount),
        },
      })
      setSession(result)
      setMessage(`Payment session created: ${result.tran_id}`)
      window.open(result.gateway_url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <div className="stack">
      <section className="glass-card panel">
        <p className="eyebrow">Billing</p>
        <h1>Top up your wallet</h1>
        <p className="hero-text">Sessions are created server-side and validated against SSLCommerz before coins are credited.</p>
        {message ? <div className="notice">{message}</div> : null}
        {session ? (
          <div className="code-block">
            {session.tran_id} · {session.gateway_url}
          </div>
        ) : null}
      </section>

      <section className="glass-card panel">
        <form className="form-grid" onSubmit={initiatePayment}>
          <label className="field">
            <span>Amount</span>
            <input
              className="input"
              type="number"
              min="1"
              step="1"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Description</span>
            <input
              className="input"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </label>
          <button className="button button-primary" type="submit">
            Open SSLCommerz checkout
          </button>
        </form>
      </section>
    </div>
  )
}
