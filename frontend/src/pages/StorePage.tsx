import { useEffect, useState, FormEvent, ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { apiFetch } from '../lib/api'
import { Card, Badge, Button, Input, PageHeader, PageTransition } from '../components'
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '0 var(--space-md)' }}>
          <PageHeader
            title="Store"
            subtitle="Loading store inventory..."
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'Store' }
            ]}
          />
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '0 var(--space-md)' }}>
        <PageHeader
          title="Store"
          subtitle="Purchase additional CPU, memory, disk, and server slots"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Store' }
          ]}
        />

        {/* Messages */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Card variant={message.includes('failed') || message.includes('Failed') ? 'default' : 'default'}>
              <div style={{ padding: 'var(--space-md)', color: message.includes('failed') || message.includes('Failed') ? 'var(--color-danger)' : 'var(--color-success)' }}>
                <p style={{ margin: 0 }}>{message}</p>
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
            <Card variant="glass">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', paddingBottom: 'var(--space-lg)', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>Pricing Options</h2>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Available Plans</p>
                </div>
                <Badge variant="primary">{prices.length} plans</Badge>
              </div>

              <div className="content-grid three-column">
                {prices.map((price, idx) => (
                  <motion.div
                    key={price.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={pricesInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card variant="elevated">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                        <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>{price.name}</h3>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: '700', color: 'var(--color-primary)' }}>{price.price}</div>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{price.currency}</div>
                        </div>
                      </div>

                      <p style={{ margin: '0 0 var(--space-md) 0', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>{price.description}</p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>CPU</span>
                          <span style={{ fontWeight: '600' }}>+{price.resources.cpu}%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Memory</span>
                          <span style={{ fontWeight: '600' }}>+{price.resources.memory}MB</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Disk</span>
                          <span style={{ fontWeight: '600' }}>+{price.resources.disk}MB</span>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Forms Section */}
        <motion.section
          ref={formsRef}
          className="content-grid two-column"
          variants={staggerContainerVariants}
          initial="hidden"
          animate={formsInView ? "visible" : "hidden"}
        >
          {/* Global Upgrade */}
          <motion.div variants={staggerItemVariants}>
            <Card variant="glass">
              <div>
                <div style={{ marginBottom: 'var(--space-lg)', paddingBottom: 'var(--space-lg)', borderBottom: '1px solid var(--border-color)' }}>
                  <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>Global Upgrade</h3>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Account-wide</p>
                </div>

                <form onSubmit={buyGlobalLimits} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
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
                    fullWidth
                  >
                    Upgrade Global Limits
                  </Button>
                </form>

                <p style={{ margin: 'var(--space-md) 0 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                  Increase your account-wide resource limits.
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Server-Specific Upgrade */}
          <motion.div variants={staggerItemVariants}>
            <Card variant="glass">
              <div>
                <div style={{ marginBottom: 'var(--space-lg)', paddingBottom: 'var(--space-lg)', borderBottom: '1px solid var(--border-color)' }}>
                  <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>Server Upgrade</h3>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Per-Server</p>
                </div>

                <form onSubmit={buyServerLimits} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  <select
                    value={serverForm.server_uuid}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                      setServerForm({ ...serverForm, server_uuid: e.target.value })
                    }
                    style={{ padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: 'var(--font-size-base)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <option value="">Select a server</option>
                    {servers.map((server) => (
                      <option key={server.id} value={server.calagopus_uuid}>
                        {server.name}
                      </option>
                    ))}
                  </select>

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
                    fullWidth
                    disabled={!serverForm.server_uuid}
                  >
                    Upgrade Server
                  </Button>
                </form>

                <p style={{ margin: 'var(--space-md) 0 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
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
