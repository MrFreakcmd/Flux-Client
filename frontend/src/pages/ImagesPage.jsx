import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

const defaultSettings = {
  enabled: true,
  embed_enabled: false,
  embed_title: '',
  embed_description: '',
  embed_color: '#64f0c8',
}

export default function ImagesPage() {
  const [images, setImages] = useState([])
  const [settings, setSettings] = useState(defaultSettings)
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState(null)
  const [uploading, setUploading] = useState(false)

  async function loadImages() {
    const [imageData, settingsData] = await Promise.all([
      apiFetch('/api/images'),
      apiFetch('/api/images/settings'),
    ])
    setImages(imageData.images || [])
    setSettings({
      enabled: settingsData.enabled,
      embed_enabled: settingsData.embed_enabled,
      embed_title: settingsData.embed_title || '',
      embed_description: settingsData.embed_description || '',
      embed_color: settingsData.embed_color || '#64f0c8',
    })
  }

  useEffect(() => {
    loadImages().catch((err) => setMessage(err.message))
  }, [])

  async function saveSettings(event) {
    event.preventDefault()
    setMessage(null)
    try {
      await apiFetch('/api/images/settings', {
        method: 'PUT',
        body: settings,
      })
      setMessage('Image settings saved.')
    } catch (err) {
      setMessage(err.message)
    }
  }

  async function upload(event) {
    event.preventDefault()
    if (!file) return
    setUploading(true)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await apiFetch('/api/images', {
        method: 'POST',
        body: formData,
      })
      setFile(null)
      await loadImages()
      setMessage('Image uploaded.')
    } catch (err) {
      setMessage(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function deleteImage(id) {
    setMessage(null)
    try {
      await apiFetch(`/api/images/${id}`, { method: 'DELETE' })
      await loadImages()
      setMessage('Image deleted.')
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <div className="stack">
      <section className="dashboard-hero glass-card">
        <div>
          <p className="eyebrow">Images</p>
          <h1>Host and share your screenshots.</h1>
          <p className="hero-text">Upload images, copy public links, and tune simple embed metadata.</p>
        </div>
        <span className="status-chip neutral">{images.length} images</span>
      </section>

      {message ? <div className="glass-card notice">{message}</div> : null}

      <section className="dashboard-grid">
        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Upload</p>
              <h3>Add an image</h3>
            </div>
          </div>
          <form className="form-grid" onSubmit={upload}>
            <label className="field full-width">
              <span>Image file</span>
              <input className="input" type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            </label>
            <button className="button button-primary" type="submit" disabled={!file || uploading}>
              {uploading ? 'Uploading...' : 'Upload image'}
            </button>
          </form>
        </article>

        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Config</p>
              <h3>Hosting settings</h3>
            </div>
          </div>
          <form className="form-grid" onSubmit={saveSettings}>
            <label className="toggle-row">
              <span>Image hosting enabled</span>
              <input type="checkbox" checked={settings.enabled} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} />
            </label>
            <label className="toggle-row">
              <span>Embeds enabled</span>
              <input type="checkbox" checked={settings.embed_enabled} onChange={(event) => setSettings({ ...settings, embed_enabled: event.target.checked })} />
            </label>
            <label className="field">
              <span>Embed title</span>
              <input className="input" value={settings.embed_title} onChange={(event) => setSettings({ ...settings, embed_title: event.target.value })} />
            </label>
            <label className="field">
              <span>Embed color</span>
              <input className="input" value={settings.embed_color} onChange={(event) => setSettings({ ...settings, embed_color: event.target.value })} />
            </label>
            <label className="field full-width">
              <span>Embed description</span>
              <textarea className="input textarea" value={settings.embed_description} onChange={(event) => setSettings({ ...settings, embed_description: event.target.value })} />
            </label>
            <button className="button button-primary" type="submit">Save settings</button>
          </form>
        </article>
      </section>

      <section className="server-grid">
        {images.map((image) => (
          <article className="glass-card image-card" key={image.id}>
            <img src={image.public_url} alt={image.original_filename} />
            <div className="image-card-body">
              <strong>{image.original_filename}</strong>
              <span>{Math.round(image.size_bytes / 1024)} KB</span>
              <div className="button-row">
                <a className="button button-ghost" href={image.public_url} target="_blank" rel="noreferrer">Open</a>
                <button className="button button-ghost" type="button" onClick={() => navigator.clipboard?.writeText(image.public_url)}>Copy URL</button>
                <button className="button button-ghost" type="button" onClick={() => deleteImage(image.id)}>Delete</button>
              </div>
            </div>
          </article>
        ))}
        {!images.length ? (
          <article className="glass-card panel">
            <p className="muted">No images uploaded yet.</p>
          </article>
        ) : null}
      </section>
    </div>
  )
}
