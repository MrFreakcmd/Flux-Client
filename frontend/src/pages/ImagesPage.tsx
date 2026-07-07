import { useEffect, useState, ChangeEvent, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { apiFetch } from '../lib/api'
import { Button, Card, Input, Badge, PageTransition, Picture } from '../components'
import { useScrollReveal, staggerContainerVariants, staggerItemVariants } from '../hooks'
import { useAriaLive } from '../hooks/useA11y'
import styles from './ImagesPage.module.css'

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
  const [loading, setLoading] = useState(true)
  const { ref: imagesRef, inView: imagesInView } = useScrollReveal()
  const { announcerRef, announce } = useAriaLive()

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
      announce(`${(imageData.images || []).length} images loaded`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load images'
      setMessage(msg)
      announce(msg, 'assertive')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadImages()
  }, [announce])

  async function saveSettings(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setMessage(null)
    try {
      await apiFetch('/api/images/settings', {
        method: 'PUT',
        body: settings,
      })
      const msg = 'Image settings saved.'
      setMessage(msg)
      announce(msg)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save settings'
      setMessage(msg)
      announce(msg, 'assertive')
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
      const msg = 'Image uploaded successfully.'
      setMessage(msg)
      announce(msg)
      setFile(null)
      await loadImages()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to upload image'
      setMessage(msg)
      announce(msg, 'assertive')
    } finally {
      setUploading(false)
    }
  }

  return (
    <PageTransition>
      <main className={styles.imagesPage}>
        <div ref={announcerRef} aria-live="polite" aria-atomic="true" style={{ display: 'none' }} />

        {/* Hero */}
        <motion.section
          className={styles.hero}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1>Share screenshots and asset files.</h1>
            <p>Upload and manage image assets for your servers and community.</p>
          </div>
          <Badge variant="primary" size="lg">
            {images.length} {images.length === 1 ? 'image' : 'images'}
          </Badge>
        </motion.section>

        {/* Message */}
        {message && (
          <motion.div
            className={styles.messageBanner}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            role={message.includes('failed') ? 'alert' : 'status'}
          >
            {message.includes('failed') ? '⚠️' : '✓'} {message}
          </motion.div>
        )}

        {/* Upload & Settings */}
        <motion.div
          className={styles.gridSection}
          initial="hidden"
          animate="visible"
          variants={staggerContainerVariants}
        >
          {/* Upload */}
          <motion.div variants={staggerItemVariants}>
            <Card className={styles.card}>
              <h2>Upload Image</h2>
              <form onSubmit={upload} className={styles.uploadForm}>
                <div className={styles.fileInput}>
                  <label htmlFor="file-upload">
                    <div className={styles.uploadPrompt}>
                      <span className={styles.uploadIcon}>📁</span>
                      <p>Choose a file to upload</p>
                      <small>or drag and drop</small>
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setFile(e.target.files?.[0] || null)
                      }
                      accept="image/*"
                      disabled={uploading}
                      className={styles.hiddenInput}
                      aria-label="Upload image file"
                    />
                  </label>
                  {file && (
                    <div className={styles.selectedFile}>
                      <span>✓ {file.name}</span>
                      <small>{(file.size / 1024).toFixed(2)} KB</small>
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={uploading}
                  disabled={uploading || !file}
                  size="lg"
                >
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </Button>
              </form>
            </Card>
          </motion.div>

          {/* Settings */}
          <motion.div variants={staggerItemVariants}>
            <Card className={styles.card}>
              <h2>Settings</h2>
              <form onSubmit={saveSettings} className={styles.settingsForm}>
                <div className={styles.settingGroup}>
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setSettings({ ...settings, enabled: e.target.checked })
                      }
                      aria-label="Enable image uploads"
                    />
                    <span>Image uploads enabled</span>
                  </label>
                </div>

                <div className={styles.settingGroup}>
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.embed_enabled}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setSettings({ ...settings, embed_enabled: e.target.checked })
                      }
                      aria-label="Enable Discord embeds"
                    />
                    <span>Discord embeds enabled</span>
                  </label>
                </div>

                {settings.embed_enabled && (
                  <div className={styles.embedSettings}>
                    <Input
                      type="text"
                      value={settings.embed_title}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setSettings({ ...settings, embed_title: e.target.value })
                      }
                      placeholder="Embed title"
                      aria-label="Discord embed title"
                    />
                    <Input
                      type="text"
                      value={settings.embed_description}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setSettings({ ...settings, embed_description: e.target.value })
                      }
                      placeholder="Embed description"
                      aria-label="Discord embed description"
                    />
                    <div className={styles.colorPicker}>
                      <label htmlFor="embed-color">Embed color:</label>
                      <input
                        id="embed-color"
                        type="color"
                        value={settings.embed_color}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setSettings({ ...settings, embed_color: e.target.value })
                        }
                        aria-label="Discord embed color"
                      />
                    </div>
                  </div>
                )}

                <Button type="submit" variant="primary" size="lg">
                  Save Settings
                </Button>
              </form>
            </Card>
          </motion.div>
        </motion.div>

        {/* Images Gallery */}
        {loading ? (
          <motion.div
            className={styles.loadingState}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className={styles.spinner} />
            <p>Loading images...</p>
          </motion.div>
        ) : images.length === 0 ? (
          <motion.div
            className={styles.emptyState}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p>No images uploaded yet. Upload one to get started.</p>
          </motion.div>
        ) : (
          <motion.section
            ref={imagesRef}
            className={styles.gallerySection}
            initial="hidden"
            animate={imagesInView ? 'visible' : 'hidden'}
            variants={staggerContainerVariants}
          >
            <h2>Your Images</h2>
            <div className={styles.gallery}>
              {images.map((img) => (
                <motion.div key={img.id} variants={staggerItemVariants} className={styles.imageCard}>
                  <div className={styles.imageWrapper}>
                    <img
                      src={img.url}
                      alt={img.filename}
                      loading="lazy"
                      className={styles.image}
                    />
                  </div>
                  <div className={styles.imageInfo}>
                    <p className={styles.filename}>{img.filename}</p>
                    <small className={styles.date}>
                      {new Date(img.created_at).toLocaleDateString()}
                    </small>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </main>
    </PageTransition>
  )
}
