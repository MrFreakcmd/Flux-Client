import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

interface Announcement {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

function formatDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleDateString() : ''
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<{ announcements: Announcement[] }>('/api/announcements')
      .then((data) => setAnnouncements(data.announcements || []))
      .catch((err) => setMessage(err instanceof Error ? err.message : 'Failed to load announcements'))
  }, [])

  return (
    <div className="stack">
      <section className="dashboard-hero glass-card">
        <div>
          <p className="eyebrow">Announcements</p>
          <h1>News from your hosting team.</h1>
          <p className="hero-text">
            Server notices, maintenance windows, and product updates appear here.
          </p>
        </div>
        <span className="status-chip neutral">{announcements.length} posts</span>
      </section>

      {message && <div className="glass-card notice error">{message}</div>}

      <section className="timeline-list">
        {announcements.map((item) => (
          <article className="glass-card panel announcement-card" key={item.id}>
            <p className="eyebrow">{formatDate(item.created_at)}</p>
            <h3>{item.title}</h3>
            <p>{item.content}</p>
          </article>
        ))}
        {!announcements.length && (
          <article className="glass-card panel">
            <p className="muted">No announcements have been published yet.</p>
          </article>
        )}
      </section>
    </div>
  )
}
