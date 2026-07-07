import { useEffect, useState, FormEvent, ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { apiFetch } from '../lib/api'
import { Card, Badge, Button, Input, PageTransition } from '../components'
import { useScrollReveal, staggerContainerVariants, staggerItemVariants } from '../hooks'
import styles from './StorePage.module.css'

interface PriceInfo {
  id: string
  name: string
  description: string
  price: number
  currency: string
  resources: {
    cpu: number
    memory: number
    disk: number
  }
}

interface Server {
  id: string
  calagopus_uuid: string
  name: string
}

const defaultGlobalForm = {
  cpu_delta: 0,
  memory_delta: 0,
  disk_delta: 0,
  slots_delta: 0,
}

const defaultServerForm = {
  server_uuid: '',
  cpu_delta: 0,
  memory_delta: 0,
  disk_delta: 0,
  slots_delta: 0,
}

export default function StorePage() {
  const [prices, setPrices] = useState<PriceInfo[] | null>(null)
  const [servers, setServers] = useState<Server[]>([])
  const [globalForm, setGlobalForm] = useState(defaultGlobalForm)
  const [serverForm, setServerForm] = useState(defaultServerForm)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [globalLoading, setGlobalLoading] = useState(false)
  const [serverLoading, setServerLoading] = useState(false)

  const { ref: pricesRef, inView: pricesInView } = useScrollReveal()
  const { ref: formsRef, inView: formsInView } = useScrollReveal()

  useEffect(() => {
    let active = true

    async function loadStore(): Promise<void> {
      try {
        const [priceData, serverData] = await Promise.all([
          apiFetch<PriceInfo[]>('/api/store/prices'),
          apiFetch<Server[]>('/api/servers'),
        ])
        if (active) {
          setPrices(priceData)
          setServers(serverData)
          setServerForm((current) => ({
            ...current,
            server_uuid: serverData[0]?.calagopus_uuid || '',
          }))
          setMessage(null)
        }
      } catch (err) {
        if (active) {
          setMessage(err instanceof Error ? err.message : 'Failed to load store')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadStore()

    return () => {
      active = false
    }
  }, [])

  async function buyGlobalLimits(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setMessage(null)
    setGlobalLoading(true)

    try {
      await apiFetch('/api/store/upgrade-limits', {
        method: 'POST',
        body: globalForm,
      })
      setMessage('Global limits upgraded successfully!')
      setGlobalForm(defaultGlobalForm)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to upgrade limits')
    } finally {
      setGlobalLoading(false)
    }
  }

  async function buyServerLimits(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setMessage(null)
    setServerLoading(true)

    try {
      await apiFetch('/api/store/upgrade-server', {
        method: 'POST',
        body: serverForm,
      })
      setMessage('Server limits upgraded successfully!')
      setServerForm(defaultServerForm)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to upgrade server')
    } finally {
      setServerLoading(false)
    }
  }

  if (loading) {
    return (
      <PageTransition>
        <div className={styles.container}>
          <section className={styles.hero}>
            <p className={styles.eyebrow}>Store</p>
            <h1>Loading store...</h1>
          </section>
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
            <p className={styles.eyebrow}>Store</p>
            <h1>Upgrade your infrastructure</h1>
            <p className={styles.heroText}>
              Purchase additional CPU, memory, disk, and server slots.
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
              <div className={message.includes('failed') || message.includes('Failed') ? styles.errorCard : styles.successCard}>
                <p className={styles.messageText}>{message}</p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Pricing Section */}
        {prices && prices.length > 0 && (
          <motion.div
            ref={pricesRef}
            initial={{ opacity: 0, y: 20 }}
            animate={pricesInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
          >
            <Card glass>
              <div className={styles.pricingCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.label}>Available Plans</p>
                    <h3>Pricing Options</h3>
                  </div>
                  <Badge variant="primary">{prices.length} plans</Badge>
                </div>

                <div className={styles.priceGrid}>
                  {prices.map((price, idx) => (
                    <motion.div
                      key={price.id}
                      className={styles.priceCard}
                      initial={{ opacity: 0, y: 10 }}
                      animate={pricesInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <div className={styles.priceHeader}>
                        <h4>{price.name}</h4>
                        <div className={styles.priceTag}>
                          <span className={styles.amount}>{price.price}</span>
                          <span className={styles.currency}>{price.currency}</span>
                        </div>
                      </div>

                      <p className={styles.priceDesc}>{price.description}</p>

                      <div className={styles.resources}>
                        <div className={styles.resourceItem}>
                          <span className={styles.resourceLabel}>CPU</span>
                          <span className={styles.resourceValue}>+{price.resources.cpu}%</span>
                        </div>
                        <div className={styles.resourceItem}>
                          <span className={styles.resourceLabel}>Memory</span>
                          <span className={styles.resourceValue}>+{price.resources.memory}MB</span>
                        </div>
                        <div className={styles.resourceItem}>
                          <span className={styles.resourceLabel}>Disk</span>
                          <span className={styles.resourceValue}>+{price.resources.disk}MB</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Forms Section */}
        <motion.section
          ref={formsRef}
          className={styles.formsGrid}
          variants={staggerContainerVariants}
          initial="hidden"
          animate={formsInView ? "visible" : "hidden"}
        >
          {/* Global Upgrade */}
          <motion.div variants={staggerItemVariants}>
            <Card glass hover>
              <div className={styles.formCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.label}>Account-wide</p>
                    <h3>Global Upgrade</h3>
                  </div>
                </div>

                <form onSubmit={buyGlobalLimits} className={styles.form}>
                  <Input
                    type="number"
                    placeholder="CPU Delta (%)"
                    value={globalForm.cpu_delta}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setGlobalForm({ ...globalForm, cpu_delta: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                  />

                  <Input
                    type="number"
                    placeholder="Memory Delta (MB)"
                    value={globalForm.memory_delta}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setGlobalForm({ ...globalForm, memory_delta: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                  />

                  <Input
                    type="number"
                    placeholder="Disk Delta (MB)"
                    value={globalForm.disk_delta}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setGlobalForm({ ...globalForm, disk_delta: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                  />

                  <Input
                    type="number"
                    placeholder="Slots Delta"
                    value={globalForm.slots_delta}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setGlobalForm({ ...globalForm, slots_delta: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={globalLoading}
                    className={styles.submitButton}
                  >
                    Upgrade Global Limits
                  </Button>
                </form>

                <p className={styles.formHint}>
                  Increase your account-wide resource limits.
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Server-Specific Upgrade */}
          <motion.div variants={staggerItemVariants}>
            <Card glass hover>
              <div className={styles.formCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.label}>Per-Server</p>
                    <h3>Server Upgrade</h3>
                  </div>
                </div>

                <form onSubmit={buyServerLimits} className={styles.form}>
                  <div className={styles.selectWrapper}>
                    <select
                      value={serverForm.server_uuid}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        setServerForm({ ...serverForm, server_uuid: e.target.value })
                      }
                      className={styles.select}
                    >
                      <option value="">Select a server</option>
                      {servers.map((server) => (
                        <option key={server.id} value={server.calagopus_uuid}>
                          {server.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    type="number"
                    placeholder="CPU Delta (%)"
                    value={serverForm.cpu_delta}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setServerForm({ ...serverForm, cpu_delta: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                  />

                  <Input
                    type="number"
                    placeholder="Memory Delta (MB)"
                    value={serverForm.memory_delta}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setServerForm({ ...serverForm, memory_delta: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                  />

                  <Input
                    type="number"
                    placeholder="Disk Delta (MB)"
                    value={serverForm.disk_delta}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setServerForm({ ...serverForm, disk_delta: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                  />

                  <Input
                    type="number"
                    placeholder="Slots Delta"
                    value={serverForm.slots_delta}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setServerForm({ ...serverForm, slots_delta: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={serverLoading}
                    className={styles.submitButton}
                    disabled={!serverForm.server_uuid}
                  >
                    Upgrade Server
                  </Button>
                </form>

                <p className={styles.formHint}>
                  Increase limits for a specific server.
                </p>
              </div>
            </Card>
          </motion.div>
        </motion.section>
      </div>
    </PageTransition>
  )
}
