import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : ''
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [message, setMessage] = useState(null)

  useEffect(() => {
    apiFetch('/api/announcements')
      .then((data) => setAnnouncements(data.announcements || []))
      .catch((err) => setMessage(err.message))
  }, [])

  return (
    <div className="stack">
      <section className="dashboard-hero glass-card">
        <div>
          <p className="eyebrow">Announcements</p>
          <h1>News from your hosting team.</h1>
          <p className="hero-text">Server notices, maintenance windows, and product updates appear here.</p>
        </div>
        <span className="status-chip neutral">{announcements.length} posts</span>
      </section>

      {message ? <div className="glass-card notice error">{message}</div> : null}

      <section className="timeline-list">
        {announcements.map((item) => (
          <article className="glass-card panel announcement-card" key={item.id}>
            <p className="eyebrow">{formatDate(item.created_at)}</p>
            <h3>{item.title}</h3>
            <p>{item.content}</p>
          </article>
        ))}
        {!announcements.length ? (
          <article className="glass-card panel">
            <p className="muted">No announcements have been published yet.</p>
          </article>
        ) : null}
      </section>
    </div>
  )
}
