import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { apiFetch } from '../lib/api'
import { Card, Badge, PageHeader, PageTransition } from '../components'
import { useScrollReveal, staggerContainerVariants, staggerItemVariants } from '../hooks'
import { useAriaLive } from '../hooks/useA11y'
import styles from './AnnouncementsPage.module.css'

interface Announcement {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { ref: announcementsRef, inView: announcementsInView } = useScrollReveal()
  const { announcerRef, announce } = useAriaLive()

  useEffect(() => {
    async function loadAnnouncements() {
      try {
        const data = await apiFetch<{ announcements: Announcement[] }>('/api/announcements')
        setAnnouncements(data.announcements || [])
        announce(`${data.announcements?.length || 0} announcements loaded`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load announcements'
        setError(message)
        announce(message, 'assertive')
      } finally {
        setLoading(false)
      }
    }
    loadAnnouncements()
  }, [announce])

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '0 var(--space-md)' }}>
        <div ref={announcerRef} aria-live="polite" aria-atomic="true" style={{ display: 'none' }} />

        <PageHeader
          title="Announcements"
          subtitle="Server notices, maintenance windows, and product updates"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Announcements' }
          ]}
          actions={
            <Badge variant="primary" size="md">
              {announcements.length} {announcements.length === 1 ? 'post' : 'posts'}
            </Badge>
          }
        />

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
          >
            <Card variant="default">
              <div style={{ padding: 'var(--space-md)' }}>
                <p style={{ color: 'var(--color-danger)', margin: 0 }}>⚠️ {error}</p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Card variant="default">
              <div style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Loading announcements...</p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && announcements.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card variant="default">
              <div style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No announcements have been published yet.</p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Announcements Grid */}
        {!loading && announcements.length > 0 && (
          <motion.section
            ref={announcementsRef}
            className="content-grid"
            initial="hidden"
            animate={announcementsInView ? 'visible' : 'hidden'}
            variants={staggerContainerVariants}
          >
            {announcements.map((announcement) => (
              <motion.div key={announcement.id} variants={staggerItemVariants}>
                <Card variant="default">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)', paddingBottom: 'var(--space-md)', borderBottom: '1px solid var(--border-color)' }}>
                    <time style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }} dateTime={announcement.created_at}>
                      {formatDate(announcement.created_at)}
                    </time>
                    {announcement.updated_at !== announcement.created_at && (
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                        updated {formatDate(announcement.updated_at)}
                      </span>
                    )}
                  </div>
                  <h3 style={{ margin: 'var(--space-md) 0', fontSize: 'var(--font-size-lg)' }}>{announcement.title}</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{announcement.content}</p>
                </Card>
              </motion.div>
            ))}
          </motion.section>
        )}
      </div>
    </PageTransition>
  )
}
