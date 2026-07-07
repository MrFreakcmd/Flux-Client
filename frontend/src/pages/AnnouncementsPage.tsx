import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { apiFetch } from '../lib/api'
import { Card, Badge, PageTransition } from '../components'
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
      <main className={styles.announcementsPage}>
        <div ref={announcerRef} aria-live="polite" aria-atomic="true" style={{ display: 'none' }} />

        {/* Hero Section */}
        <motion.section
          className={styles.hero}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.heroContent}>
            <h1>News from your hosting team.</h1>
            <p>Server notices, maintenance windows, and product updates appear here.</p>
          </div>
          <Badge variant="neutral" size="lg">
            {announcements.length} {announcements.length === 1 ? 'post' : 'posts'}
          </Badge>
        </motion.section>

        {/* Error State */}
        {error && (
          <motion.div
            className={styles.errorBanner}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
          >
            <span>⚠️</span>
            <p>{error}</p>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <motion.div
            className={styles.loadingState}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className={styles.spinner} />
            <p>Loading announcements...</p>
          </motion.div>
        )}

        {/* Announcements List */}
        {!loading && announcements.length === 0 && !error && (
          <motion.div
            className={styles.emptyState}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p>No announcements have been published yet.</p>
          </motion.div>
        )}

        {!loading && announcements.length > 0 && (
          <motion.section
            ref={announcementsRef}
            className={styles.announcementsList}
            initial="hidden"
            animate={announcementsInView ? 'visible' : 'hidden'}
            variants={staggerContainerVariants}
          >
            {announcements.map((announcement) => (
              <motion.div key={announcement.id} variants={staggerItemVariants}>
                <Card hover className={styles.announcementCard}>
                  <div className={styles.cardHeader}>
                    <time className={styles.date} dateTime={announcement.created_at}>
                      {formatDate(announcement.created_at)}
                    </time>
                    {announcement.updated_at !== announcement.created_at && (
                      <span className={styles.edited}>
                        (updated {formatDate(announcement.updated_at)})
                      </span>
                    )}
                  </div>
                  <h3>{announcement.title}</h3>
                  <p className={styles.content}>{announcement.content}</p>
                </Card>
              </motion.div>
            ))}
          </motion.section>
        )}
      </main>
    </PageTransition>
  )
}
