import { useEffect, useState, ChangeEvent, FormEvent } from 'react'
import { apiFetch } from '../lib/api'

interface AppSettings {
  app_name: string
  logo_url: string
  favicon_url: string
  primary_color: string
  secondary_color: string
  footer_text: string
  support_email: string
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [formData, setFormData] = useState<AppSettings | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings(): Promise<void> {
    setLoading(true)
    try {
      const data = await apiFetch<AppSettings>('/api/settings')
      setSettings(data)
      setFormData(data)
      applySettings(data)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  function applySettings(appSettings: AppSettings): void {
    // Update page title
    document.title = appSettings.app_name

    // Update favicon
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
    if (favicon) {
      favicon.href = appSettings.favicon_url
    }

    // Update CSS variables for theming
    const root = document.documentElement
    root.style.setProperty('--primary-color', appSettings.primary_color)
    root.style.setProperty('--secondary-color', appSettings.secondary_color)

    // Update brand name in sidebar if element exists
    const brandElement = document.querySelector('.brand-lockup h1')
    if (brandElement) {
      brandElement.textContent = appSettings.app_name
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    await saveSettings()
  }

  async function saveSettings(): Promise<void> {
    if (!formData) return

    setMessage(null)
    try {
      const updated = await apiFetch<AppSettings>('/api/settings', {
        method: 'PUT',
        body: formData,
      })
      setSettings(updated)
      applySettings(updated)
      setMessage('Settings updated successfully!')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update settings')
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void {
    const { name, value } = e.target
    setFormData((prev) => (prev ? { ...prev, [name]: value } : null))
  }

  async function handleReset(): Promise<void> {
    if (!window.confirm('Reset all settings to defaults?')) return
    setMessage(null)
    try {
      // Reset all settings by calling reset for each one
      const settingKeys = Object.keys(settings || {}) as (keyof AppSettings)[]
      for (const key of settingKeys) {
        await apiFetch(`/api/settings/reset/${key}`, { method: 'POST' })
      }
      await loadSettings()
      setMessage('All settings reset to defaults!')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to reset settings')
    }
  }

  if (loading) {
    return <div className="glass-card">Loading settings...</div>
  }

  if (!settings || !formData) {
    return <div className="glass-card notice error">Failed to load settings</div>
  }

  return (
    <div className="stack">
      <section className="dashboard-hero glass-card">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Application Settings</h1>
          <p className="hero-text">Customize your application branding and configuration.</p>
        </div>
      </section>

      {message && (
        <div className={`glass-card notice ${message.includes('Failed') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <section className="glass-card panel">
        <h3>Branding Settings</h3>
        <form onSubmit={handleSubmit} className="form-stack">
          <div className="form-group">
            <label>Application Name</label>
            <input
              type="text"
              name="app_name"
              value={formData.app_name}
              onChange={handleChange}
              className="input"
              placeholder="e.g., Flux Client"
            />
            <small>Displayed in navbar, browser tab, and landing page</small>
          </div>

          <div className="form-group">
            <label>Logo URL</label>
            <input
              type="text"
              name="logo_url"
              value={formData.logo_url}
              onChange={handleChange}
              className="input"
              placeholder="e.g., /assets/logo.png"
            />
            <small>Path to your logo image file</small>
          </div>

          <div className="form-group">
            <label>Favicon URL</label>
            <input
              type="text"
              name="favicon_url"
              value={formData.favicon_url}
              onChange={handleChange}
              className="input"
              placeholder="e.g., /assets/favicon.ico"
            />
            <small>Path to your favicon file</small>
          </div>

          <div className="form-group">
            <label>Footer Text</label>
            <textarea
              name="footer_text"
              value={formData.footer_text}
              onChange={handleChange}
              className="input textarea"
              placeholder="e.g., © 2026 Your Company. All rights reserved."
            />
            <small>Text displayed in the footer</small>
          </div>

          <div className="form-group">
            <label>Support Email</label>
            <input
              type="email"
              name="support_email"
              value={formData.support_email}
              onChange={handleChange}
              className="input"
              placeholder="support@example.com"
            />
            <small>Contact email for support requests</small>
          </div>
        </form>
      </section>

      <section className="glass-card panel">
        <h3>Theme Colors</h3>
        <form className="form-stack">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Primary Color</label>
              <input
                type="color"
                name="primary_color"
                value={formData.primary_color}
                onChange={handleChange}
                style={{ width: '100%', height: '50px', borderRadius: '0.5rem', cursor: 'pointer' }}
              />
              <input
                type="text"
                value={formData.primary_color}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: AppSettings | null) =>
                    prev ? { ...prev, primary_color: e.target.value } : null
                  )
                }
                className="input"
                style={{ marginTop: '0.5rem' }}
              />
            </div>

            <div className="form-group">
              <label>Secondary Color</label>
              <input
                type="color"
                name="secondary_color"
                value={formData.secondary_color}
                onChange={handleChange}
                style={{ width: '100%', height: '50px', borderRadius: '0.5rem', cursor: 'pointer' }}
              />
              <input
                type="text"
                value={formData.secondary_color}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: AppSettings | null) =>
                    prev ? { ...prev, secondary_color: e.target.value } : null
                  )
                }
                className="input"
                style={{ marginTop: '0.5rem' }}
              />
            </div>
          </div>
        </form>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <button onClick={saveSettings} className="button button-primary" style={{ padding: '1rem' }}>
          Save All Settings
        </button>
        <button onClick={handleReset} className="button button-secondary" style={{ padding: '1rem' }}>
          Reset to Defaults
        </button>
      </section>

      <section className="glass-card panel">
        <h3>Preview</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              backgroundColor: formData.primary_color,
              borderRadius: '0.5rem',
            }}
          />
          <div>
            <p>
              <strong>App Name:</strong> {formData.app_name}
            </p>
            <p>
              <strong>Primary Color:</strong> {formData.primary_color}
            </p>
            <p>
              <strong>Secondary Color:</strong> {formData.secondary_color}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
