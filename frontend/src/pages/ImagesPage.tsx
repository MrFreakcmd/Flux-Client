import { useEffect, useState, ChangeEvent, FormEvent } from 'react'
import { apiFetch } from '../lib/api'

interface ImageSettings {
  enabled: boolean
  embed_enabled: boolean
  embed_title: string
  embed_description: string
  embed_color: string
}

interface Image {
  id: string
  filename: string
  url: string
  created_at: string
}

const defaultSettings: ImageSettings = {
  enabled: true,
  embed_enabled: false,
  embed_title: '',
  embed_description: '',
  embed_color: '#64f0c8',
}

export default function ImagesPage() {
  const [images, setImages] = useState<Image[]>([])
  const [settings, setSettings] = useState<ImageSettings>(defaultSettings)
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function loadImages(): Promise<void> {
    try {
      const [imageData, settingsData] = await Promise.all([
        apiFetch<{ images: Image[] }>('/api/images'),
        apiFetch<ImageSettings>('/api/images/settings'),
      ])
      setImages(imageData.images || [])
      setSettings({
        enabled: settingsData.enabled,
        embed_enabled: settingsData.embed_enabled,
        embed_title: settingsData.embed_title || '',
        embed_description: settingsData.embed_description || '',
        embed_color: settingsData.embed_color || '#64f0c8',
      })
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load images')
    }
  }

  useEffect(() => {
    loadImages()
  }, [])

  async function saveSettings(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setMessage(null)
    try {
      await apiFetch('/api/images/settings', {
        method: 'PUT',
        body: settings,
      })
      setMessage('Image settings saved.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save settings')
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>): Promise<void> {
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
      setMessage('Image uploaded successfully.')
      setFile(null)
      await loadImages()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="stack">
      <section className="dashboard-hero glass-card">
        <div>
          <p className="eyebrow">Images</p>
          <h1>Share screenshots and asset files.</h1>
          <p className="hero-text">Upload and manage image assets for your servers and community.</p>
        </div>
      </section>

      {message && <div className="glass-card notice">{message}</div>}

      <section className="dashboard-grid">
        <article className="glass-card panel">
          <h3>Upload</h3>
          <form onSubmit={upload}>
            <input
              type="file"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
            />
            <button type="submit" className="button button-primary" disabled={uploading || !file}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </form>
        </article>

        <article className="glass-card panel">
          <h3>Settings</h3>
          <form onSubmit={saveSettings}>
            <label>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setSettings({ ...settings, enabled: e.target.checked })
                }
              />
              Enabled
            </label>
            <button type="submit" className="button button-primary">
              Save
            </button>
          </form>
        </article>
      </section>

      <section className="glass-card">
        <h3>Images ({images.length})</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
          {images.map((img) => (
            <div key={img.id}>
              <img src={img.url} alt={img.filename} style={{ width: '100%', borderRadius: '0.5rem' }} />
              <small>{img.filename}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
