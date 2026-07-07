import { useEffect, useState, FormEvent, ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'
import { Card, Badge, Button, Input, PageTransition } from '../components'
import { useScrollReveal } from '../hooks'
import styles from './ServersPage.module.css'

interface Server {
  id: string
  calagopus_uuid: string
  name: string
  cpu_limit: number
  memory_limit: number
  disk_limit: number
  slots: number
  is_suspended: boolean
  created_at: string
}

const defaultCreateForm = {
  name: '',
  egg_uuid: '',
  node_uuid: '',
  cpu_limit: 100,
  memory_limit: 2048,
  disk_limit: 10000,
  slots: 1,
}

const defaultUpdateForm = {
  name: '',
  cpu_limit: 100,
  memory_limit: 2048,
  disk_limit: 10000,
  slots: 1,
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'No lease'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ServersPage() {
  const params = useParams()
  const { refreshUser } = useAuth()
  const [servers, setServers] = useState<Server[]>([])
  const [selectedServerId, setSelectedServerId] = useState<string | null>(params.serverId || null)
  const [createForm, setCreateForm] = useState(defaultCreateForm)
  const [updateForm, setUpdateForm] = useState(defaultUpdateForm)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [createLoading, setCreateLoading] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const { ref: serversRef, inView: serversInView } = useScrollReveal()

  async function loadServers(): Promise<void> {
    setLoading(true)
    try {
      const data = await apiFetch<Server[]>('/api/servers')
      setServers(data)
      const nextSelected = params.serverId || selectedServerId || data[0]?.calagopus_uuid || null
      setSelectedServerId(nextSelected)
      setMessage(null)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load servers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServers()
  }, [params.serverId])

  const selectedServer = servers.find((server) => server.calagopus_uuid === selectedServerId) || servers[0] || null

  useEffect(() => {
    if (!selectedServer) return
    setUpdateForm({
      name: selectedServer.name,
      cpu_limit: selectedServer.cpu_limit,
      memory_limit: selectedServer.memory_limit,
      disk_limit: selectedServer.disk_limit,
      slots: selectedServer.slots,
    })
  }, [selectedServer?.calagopus_uuid])

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setMessage(null)
    setCreateLoading(true)

    try {
      await apiFetch('/api/servers/create', {
        method: 'POST',
        body: {
          ...createForm,
          cpu_limit: Number(createForm.cpu_limit),
          memory_limit: Number(createForm.memory_limit),
          disk_limit: Number(createForm.disk_limit),
          slots: Number(createForm.slots),
        },
      })
      setMessage('Server created successfully.')
      setCreateForm(defaultCreateForm)
      await loadServers()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to create server')
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!selectedServer) return
    setMessage(null)
    setUpdateLoading(true)

    try {
      await apiFetch(`/api/servers/${selectedServer.id}`, {
        method: 'PATCH',
        body: updateForm,
      })
      setMessage('Server updated successfully.')
      await loadServers()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update server')
    } finally {
      setUpdateLoading(false)
    }
  }

  async function deleteServer(): Promise<void> {
    if (!selectedServer || !window.confirm('Delete this server? This cannot be undone.')) return
    setMessage(null)
    setDeleteLoading(true)

    try {
      await apiFetch(`/api/servers/${selectedServer.id}`, { method: 'DELETE' })
      setMessage('Server deleted.')
      setSelectedServerId(null)
      await loadServers()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to delete server')
    } finally {
      setDeleteLoading(false)
    }
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
            <p className={styles.eyebrow}>Servers</p>
            <h1>Manage your game servers</h1>
            <p className={styles.heroText}>
              Create, configure, and monitor your Calagopus servers.
            </p>
          </div>
        </motion.section>

        {/* Messages */}
        <AnimatePresence>
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
        </AnimatePresence>

        {/* Content Grid */}
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card glass>
              <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <p>Loading your servers...</p>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.section
            ref={serversRef}
            className={styles.contentGrid}
            initial={{ opacity: 0, y: 20 }}
            animate={serversInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {/* Servers List */}
            <Card glass hover={false}>
              <div className={styles.serversList}>
                <div className={styles.listHeader}>
                  <p className={styles.label}>Your Servers</p>
                  <Badge variant="primary">{servers.length}</Badge>
                </div>

                {servers.length > 0 ? (
                  <div className={styles.listItems}>
                    {servers.map((server, idx) => (
                      <motion.button
                        key={server.id}
                        className={`${styles.serverButton} ${
                          selectedServer?.id === server.id ? styles.active : ''
                        }`}
                        onClick={() => setSelectedServerId(server.calagopus_uuid)}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ x: 4 }}
                      >
                        <div className={styles.serverButtonContent}>
                          <strong className={styles.serverName}>{server.name}</strong>
                          <div className={styles.serverSpec}>
                            <span>{server.cpu_limit}% CPU</span>
                            <span>•</span>
                            <span>{server.memory_limit}MB RAM</span>
                            {server.is_suspended && (
                              <>
                                <span>•</span>
                                <Badge variant="danger" size="sm">
                                  Suspended
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <p>No servers yet. Create your first server to get started.</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Server Details */}
            <AnimatePresence mode="wait">
              {selectedServer ? (
                <motion.div
                  key={selectedServer.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card glass hover={false}>
                    <div className={styles.detailsForm}>
                      <div className={styles.formHeader}>
                        <div>
                          <p className={styles.label}>Server Details</p>
                          <h3>{selectedServer.name}</h3>
                        </div>
                        <Badge variant={selectedServer.is_suspended ? 'danger' : 'success'}>
                          {selectedServer.is_suspended ? 'Suspended' : 'Active'}
                        </Badge>
                      </div>

                      <div className={styles.metadata}>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Created</span>
                          <span className={styles.metaValue}>{formatDate(selectedServer.created_at)}</span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>UUID</span>
                          <code className={styles.uuid}>{selectedServer.calagopus_uuid}</code>
                        </div>
                      </div>

                      <form onSubmit={handleUpdate} className={styles.form}>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>Server Name</label>
                          <Input
                            type="text"
                            value={updateForm.name}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              setUpdateForm({ ...updateForm, name: e.target.value })
                            }
                            placeholder="Server name"
                          />
                        </div>

                        <div className={styles.formGrid}>
                          <div className={styles.formGroup}>
                            <label className={styles.formLabel}>CPU Limit (%)</label>
                            <Input
                              type="number"
                              value={updateForm.cpu_limit}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setUpdateForm({ ...updateForm, cpu_limit: parseInt(e.target.value) || 0 })
                              }
                              min="0"
                            />
                          </div>

                          <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Memory (MB)</label>
                            <Input
                              type="number"
                              value={updateForm.memory_limit}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setUpdateForm({ ...updateForm, memory_limit: parseInt(e.target.value) || 0 })
                              }
                              min="0"
                            />
                          </div>
                        </div>

                        <div className={styles.formGrid}>
                          <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Disk (MB)</label>
                            <Input
                              type="number"
                              value={updateForm.disk_limit}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setUpdateForm({ ...updateForm, disk_limit: parseInt(e.target.value) || 0 })
                              }
                              min="0"
                            />
                          </div>

                          <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Slots</label>
                            <Input
                              type="number"
                              value={updateForm.slots}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setUpdateForm({ ...updateForm, slots: parseInt(e.target.value) || 0 })
                              }
                              min="0"
                            />
                          </div>
                        </div>

                        <div className={styles.formActions}>
                          <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            isLoading={updateLoading}
                          >
                            Save Changes
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="md"
                            isLoading={deleteLoading}
                            onClick={deleteServer}
                          >
                            Delete Server
                          </Button>
                        </div>
                      </form>
                    </div>
                  </Card>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Create Server */}
            <Card glass hover={false}>
              <div className={styles.createForm}>
                <div className={styles.formHeader}>
                  <div>
                    <p className={styles.label}>New Server</p>
                    <h3>Create Server</h3>
                  </div>
                </div>

                <form onSubmit={handleCreate} className={styles.form}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Server Name</label>
                    <Input
                      type="text"
                      value={createForm.name}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setCreateForm({ ...createForm, name: e.target.value })
                      }
                      placeholder="Enter server name"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Egg UUID</label>
                    <Input
                      type="text"
                      value={createForm.egg_uuid}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setCreateForm({ ...createForm, egg_uuid: e.target.value })
                      }
                      placeholder="Enter egg UUID"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Node UUID</label>
                    <Input
                      type="text"
                      value={createForm.node_uuid}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setCreateForm({ ...createForm, node_uuid: e.target.value })
                      }
                      placeholder="Enter node UUID"
                    />
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>CPU Limit (%)</label>
                      <Input
                        type="number"
                        value={createForm.cpu_limit}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setCreateForm({ ...createForm, cpu_limit: parseInt(e.target.value) || 0 })
                        }
                        min="0"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Memory (MB)</label>
                      <Input
                        type="number"
                        value={createForm.memory_limit}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setCreateForm({ ...createForm, memory_limit: parseInt(e.target.value) || 0 })
                        }
                        min="0"
                      />
                    </div>
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Disk (MB)</label>
                      <Input
                        type="number"
                        value={createForm.disk_limit}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setCreateForm({ ...createForm, disk_limit: parseInt(e.target.value) || 0 })
                        }
                        min="0"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Slots</label>
                      <Input
                        type="number"
                        value={createForm.slots}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setCreateForm({ ...createForm, slots: parseInt(e.target.value) || 0 })
                        }
                        min="0"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="success"
                    size="md"
                    isLoading={createLoading}
                    className={styles.submitButton}
                  >
                    Create Server
                  </Button>
                </form>
              </div>
            </Card>
          </motion.section>
        )}
      </div>
    </PageTransition>
  )
}
