import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { apiFetch } from '../lib/api'
import { Card, Badge, PageTransition } from '../components'
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
      <div className={styles.container}>
        {/* Hero Section */}
        <motion.section
          className={styles.hero}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <p className={styles.eyebrow}>Billing</p>
            <h1>Manage payments and billing</h1>
            <p className={styles.heroText}>
              View transaction history, manage payment methods, and update billing settings.
            </p>
          </div>
        </motion.section>

        {/* Error Message */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <div className={styles.errorCard}>
                <p className={styles.errorText}>{message}</p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Info Sections */}
        <motion.div
          ref={infoRef}
          className={styles.infoGrid}
          variants={staggerContainerVariants}
          initial="hidden"
          animate={infoInView ? "visible" : "hidden"}
        >
          <motion.div variants={staggerItemVariants}>
            <Card glass hover>
              <div className={styles.infoCard}>
                <p className={styles.label}>Payment Gateway</p>
                <h3 className={styles.title}>SSLCommerz</h3>
                <p className={styles.description}>
                  This dashboard integrates with SSLCommerz for secure payment processing.
                </p>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={staggerItemVariants}>
            <Card glass hover>
              <div className={styles.infoCard}>
                <p className={styles.label}>Top-ups</p>
                <h3 className={styles.title}>Store</h3>
                <p className={styles.description}>
                  All account top-ups are managed through the store with multiple payment options.
                </p>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={staggerItemVariants}>
            <Card glass hover>
              <div className={styles.infoCard}>
                <p className={styles.label}>Security</p>
                <h3 className={styles.title}>Verified</h3>
                <p className={styles.description}>
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
          <Card glass>
            <div className={styles.transactionsCard}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.label}>Recent Activity</p>
                  <h3>Transaction History</h3>
                </div>
                <Badge variant={loading ? 'secondary' : 'success'} size="sm">
                  {loading ? 'Loading...' : `${tickets.length} ${tickets.length === 1 ? 'transaction' : 'transactions'}`}
                </Badge>
              </div>

              {tickets.length > 0 ? (
                <div className={styles.transactionsList}>
                  {tickets.map((ticket, idx) => (
                    <motion.div
                      key={ticket.id}
                      className={styles.transactionRow}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div className={styles.transactionMain}>
                        <div className={styles.transactionInfo}>
                          <strong className={styles.subject}>{ticket.subject}</strong>
                          <p className={styles.department}>{ticket.department}</p>
                        </div>
                      </div>

                      <div className={styles.transactionMeta}>
                        <Badge
                          variant={statusVariantMap[ticket.status.toLowerCase()] || 'secondary'}
                          size="sm"
                        >
                          {ticket.status}
                        </Badge>
                        <span className={styles.date}>
                          {formatDate(ticket.created_at)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <p>No transactions yet.</p>
                  <p className={styles.emptySubtext}>
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
