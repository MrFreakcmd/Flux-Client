import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

interface Ticket {
  id: string
  subject: string
  status: string
  department: string
  created_at: string
  updated_at: string
}

export default function BillingPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<{ tickets: Ticket[] }>('/api/billing/history')
      .then((data) => setTickets(data.tickets || []))
      .catch((err) => setMessage(err instanceof Error ? err.message : 'Failed to load billing history'))
  }, [])

  return (
    <div className="stack">
      <section className="dashboard-hero glass-card">
        <div>
          <p className="eyebrow">Billing</p>
          <h1>Manage payments and billing.</h1>
          <p className="hero-text">View transaction history, manage payment methods, and update billing settings.</p>
        </div>
      </section>

      {message && <div className="glass-card notice error">{message}</div>}

      <section className="glass-card panel">
        <h3>Payment Integration</h3>
        <p>This dashboard integrates with SSLCommerz for payment processing. Top-ups are managed through the store.</p>
        <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>
          All transactions are securely processed and validated through SSLCommerz gateway.
        </p>
      </section>

      <section className="glass-card panel">
        <h3>Recent Transactions ({tickets.length})</h3>
        {tickets.length > 0 ? (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div>
                  <strong>{ticket.subject}</strong>
                  <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>{ticket.department}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ textTransform: 'capitalize' }}>{ticket.status}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ opacity: 0.6 }}>No transactions yet.</p>
        )}
      </section>
    </div>
  )
}
