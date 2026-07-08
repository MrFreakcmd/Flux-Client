import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { apiFetch } from '../lib/api'
import { Card, Badge, PageHeader, PageTransition } from '../components'
import { useScrollReveal, staggerContainerVariants, staggerItemVariants } from '../hooks'
import styles from './BillingPage.module.css'

interface Ticket {
  id: string
  subject: string
  status: string
  department: string
  created_at: string
  updated_at: string
}

const statusVariantMap: Record<string, 'success' | 'warning' | 'danger' | 'primary'> = {
  completed: 'success',
  pending: 'warning',
  failed: 'danger',
  processing: 'primary',
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function BillingPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const { ref: infoRef, inView: infoInView } = useScrollReveal()
  const { ref: transRef, inView: transInView } = useScrollReveal()

  useEffect(() => {
    apiFetch<{ tickets: Ticket[] }>('/api/billing/history')
      .then((data) => {
        setTickets(data.tickets || [])
        setMessage(null)
      })
      .catch((err) => {
        setMessage(err instanceof Error ? err.message : 'Failed to load billing history')
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '0 var(--space-md)' }}>
        <PageHeader
          title="Billing"
          subtitle="View transaction history, manage payment methods, and update billing settings"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Billing' }
          ]}
        />

        {/* Error Message */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card variant="default">
              <div style={{ padding: 'var(--space-md)', color: 'var(--color-danger)' }}>
                <p style={{ margin: 0 }}>{message}</p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Info Sections */}
        <motion.div
          ref={infoRef}
          className="content-grid three-column"
          variants={staggerContainerVariants}
          initial="hidden"
          animate={infoInView ? "visible" : "hidden"}
        >
          <motion.div variants={staggerItemVariants}>
            <Card variant="glass">
              <div>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0, marginBottom: 'var(--space-sm)' }}>Payment Gateway</p>
                <h3 style={{ margin: '0 0 var(--space-sm) 0', fontSize: 'var(--font-size-md)' }}>SSLCommerz</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: 'var(--font-size-sm)' }}>
                  This dashboard integrates with SSLCommerz for secure payment processing.
                </p>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={staggerItemVariants}>
            <Card variant="glass">
              <div>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0, marginBottom: 'var(--space-sm)' }}>Top-ups</p>
                <h3 style={{ margin: '0 0 var(--space-sm) 0', fontSize: 'var(--font-size-md)' }}>Store</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: 'var(--font-size-sm)' }}>
                  All account top-ups are managed through the store with multiple payment options.
                </p>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={staggerItemVariants}>
            <Card variant="glass">
              <div>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0, marginBottom: 'var(--space-sm)' }}>Security</p>
                <h3 style={{ margin: '0 0 var(--space-sm) 0', fontSize: 'var(--font-size-md)' }}>Verified</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: 'var(--font-size-sm)' }}>
                  All transactions are securely processed and validated through the payment gateway.
                </p>
              </div>
            </Card>
          </motion.div>
        </motion.div>

        {/* Transactions Section */}
        <motion.div
          ref={transRef}
          initial={{ opacity: 0, y: 20 }}
          animate={transInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card variant="elevated">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', paddingBottom: 'var(--space-lg)', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>Transaction History</h2>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Recent Activity</p>
                </div>
                <Badge variant={loading ? 'secondary' : 'success'} size="md">
                  {loading ? 'Loading...' : `${tickets.length} ${tickets.length === 1 ? 'transaction' : 'transactions'}`}
                </Badge>
              </div>

              {tickets.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  {tickets.map((ticket, idx) => (
                    <motion.div
                      key={ticket.id}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 'var(--space-md)', borderBottom: idx < tickets.length - 1 ? '1px solid var(--border-color)' : 'none' }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div>
                        <strong style={{ display: 'block', marginBottom: '4px' }}>{ticket.subject}</strong>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>{ticket.department}</p>
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                        <Badge
                          variant={statusVariantMap[ticket.status.toLowerCase()] || 'secondary'}
                          size="sm"
                        >
                          {ticket.status}
                        </Badge>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                          {formatDate(ticket.created_at)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--space-lg) 0' }}>
                  <p style={{ margin: 0, fontWeight: '500' }}>No transactions yet.</p>
                  <p style={{ margin: 'var(--space-sm) 0 0 0', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                    Top up your account through the store to see transactions here.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </PageTransition>
  )
}
