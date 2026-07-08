import { useEffect, useState, ChangeEvent, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { apiFetch } from '../lib/api'
import { Card, Badge, Button, Input, PageHeader, PageTransition } from '../components'
import { useScrollReveal } from '../hooks'
import styles from './AdminSettingsPage.module.css'

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
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  const { ref: previewRef, inView: previewInView } = useScrollReveal()

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
      setMessage(null)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  function applySettings(appSettings: AppSettings): void {
    document.title = appSettings.app_name

    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
    if (favicon) {
      favicon.href = appSettings.favicon_url
    }

    const root = document.documentElement
    root.style.setProperty('--primary-color', appSettings.primary_color)
    root.style.setProperty('--secondary-color', appSettings.secondary_color)

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
    setSaving(true)

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
    } finally {
      setSaving(false)
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void {
    const { name, value } = e.target
    setFormData((prev) => (prev ? { ...prev, [name]: value } : null))
  }

  async function handleReset(): Promise<void> {
    if (!window.confirm('Reset all settings to defaults? This cannot be undone.')) return
    setMessage(null)
    setResetting(true)

    try {
      const settingKeys = Object.keys(settings || {}) as (keyof AppSettings)[]
      for (const key of settingKeys) {
        await apiFetch(`/api/settings/reset/${key}`, { method: 'POST' })
      }
      await loadSettings()
      setMessage('All settings reset to defaults!')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to reset settings')
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <PageTransition>
        <div className={styles.container}>
          <Card glass>
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>Loading settings...</p>
            </div>
          </Card>
        </div>
      </PageTransition>
    )
  }

  if (!settings || !formData) {
    return (
      <PageTransition>
        <div className={styles.container}>
          <Card>
            <div className={styles.errorCard}>
              <p className={styles.errorText}>Failed to load settings</p>
            </div>
          </Card>
        </div>
      </PageTransition>
    )
  }

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
            <p className={styles.eyebrow}>Admin</p>
            <h1>Application Settings</h1>
            <p className={styles.heroText}>
              Customize your application branding and configuration.
            </p>
          </div>
        </motion.section>

        {/* Messages */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <div className={message.includes('Failed') ? styles.errorCard : styles.successCard}>
                <p className={styles.messageText}>{message}</p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className={styles.contentGrid}>
          {/* Branding Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card glass>
              <div className={styles.formCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.label}>Identity</p>
                    <h3>Branding Settings</h3>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Application Name</label>
                    <Input
                      type="text"
                      name="app_name"
                      value={formData.app_name}
                      onChange={handleChange}
                      placeholder="e.g., Flux Client"
                    />
                    <p className={styles.hint}>Displayed in navbar, browser tab, and landing page</p>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Logo URL</label>
                    <Input
                      type="text"
                      name="logo_url"
                      value={formData.logo_url}
                      onChange={handleChange}
                      placeholder="e.g., /assets/logo.png"
                    />
                    <p className={styles.hint}>Path to your logo image file</p>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Favicon URL</label>
                    <Input
                      type="text"
                      name="favicon_url"
                      value={formData.favicon_url}
                      onChange={handleChange}
                      placeholder="e.g., /assets/favicon.ico"
                    />
                    <p className={styles.hint}>Path to your favicon file</p>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Support Email</label>
                    <Input
                      type="email"
                      name="support_email"
                      value={formData.support_email}
                      onChange={handleChange}
                      placeholder="support@example.com"
                    />
                    <p className={styles.hint}>Contact email for support requests</p>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Footer Text</label>
                    <textarea
                      name="footer_text"
                      value={formData.footer_text}
                      onChange={handleChange}
                      placeholder="© 2026 Your Company. All rights reserved."
                      className={styles.textarea}
                      rows={3}
                    />
                    <p className={styles.hint}>Text displayed in the footer</p>
                  </div>
                </form>
              </div>
            </Card>
          </motion.div>

          {/* Theme Colors */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card glass>
              <div className={styles.formCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.label}>Appearance</p>
                    <h3>Theme Colors</h3>
                  </div>
                </div>

                <div className={styles.colorGrid}>
                  <div className={styles.colorGroup}>
                    <label className={styles.formLabel}>Primary Color</label>
                    <div className={styles.colorPickerWrapper}>
                      <input
                        type="color"
                        name="primary_color"
                        value={formData.primary_color}
                        onChange={handleChange}
                        className={styles.colorPicker}
                      />
                      <div
                        className={styles.colorPreview}
                        style={{ backgroundColor: formData.primary_color }}
                      />
                    </div>
                    <Input
                      type="text"
                      value={formData.primary_color}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev) =>
                          prev ? { ...prev, primary_color: e.target.value } : null
                        )
                      }
                      className={styles.colorInput}
                    />
                  </div>

                  <div className={styles.colorGroup}>
                    <label className={styles.formLabel}>Secondary Color</label>
                    <div className={styles.colorPickerWrapper}>
                      <input
                        type="color"
                        name="secondary_color"
                        value={formData.secondary_color}
                        onChange={handleChange}
                        className={styles.colorPicker}
                      />
                      <div
                        className={styles.colorPreview}
                        style={{ backgroundColor: formData.secondary_color }}
                      />
                    </div>
                    <Input
                      type="text"
                      value={formData.secondary_color}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev) =>
                          prev ? { ...prev, secondary_color: e.target.value } : null
                        )
                      }
                      className={styles.colorInput}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Actions */}
        <motion.div
          className={styles.actions}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Button
            type="button"
            onClick={saveSettings}
            variant="primary"
            size="md"
            isLoading={saving}
            className={styles.actionButton}
          >
            Save All Settings
          </Button>
          <Button
            type="button"
            onClick={handleReset}
            variant="secondary"
            size="md"
            isLoading={resetting}
            className={styles.actionButton}
          >
            Reset to Defaults
          </Button>
        </motion.div>

        {/* Preview */}
        <motion.div
          ref={previewRef}
          initial={{ opacity: 0, y: 20 }}
          animate={previewInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
        >
          <Card glass>
            <div className={styles.previewCard}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.label}>Preview</p>
                  <h3>Live Preview</h3>
                </div>
              </div>

              <div className={styles.previewContent}>
                <div className={styles.previewColors}>
                  <div className={styles.colorSwatch}>
                    <div
                      className={styles.colorSwatchBox}
                      style={{ backgroundColor: formData.primary_color }}
                    />
                    <div className={styles.colorSwatchLabel}>
                      <span className={styles.colorName}>Primary</span>
                      <code>{formData.primary_color}</code>
                    </div>
                  </div>

                  <div className={styles.colorSwatch}>
                    <div
                      className={styles.colorSwatchBox}
                      style={{ backgroundColor: formData.secondary_color }}
                    />
                    <div className={styles.colorSwatchLabel}>
                      <span className={styles.colorName}>Secondary</span>
                      <code>{formData.secondary_color}</code>
                    </div>
                  </div>
                </div>

                <div className={styles.previewInfo}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>App Name</span>
                    <span className={styles.infoValue}>{formData.app_name}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Support Email</span>
                    <span className={styles.infoValue}>{formData.support_email}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </PageTransition>
  )
}
