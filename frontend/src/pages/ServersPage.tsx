import { useEffect, useState, FormEvent, ChangeEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

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
  return value ? new Date(value).toLocaleString() : 'No lease'
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

  async function loadServers(): Promise<void> {
    setLoading(true)
    try {
      const data = await apiFetch<Server[]>('/api/servers')
      setServers(data)
      const nextSelected = params.serverId || selectedServerId || data[0]?.calagopus_uuid || null
      setSelectedServerId(nextSelected)
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
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!selectedServer) return
    setMessage(null)
    try {
      await apiFetch(`/api/servers/${selectedServer.id}`, {
        method: 'PATCH',
        body: updateForm,
      })
      setMessage('Server updated successfully.')
      await loadServers()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update server')
    }
  }

  async function deleteServer(): Promise<void> {
    if (!selectedServer || !window.confirm('Delete this server?')) return
    setMessage(null)
    try {
      await apiFetch(`/api/servers/${selectedServer.id}`, { method: 'DELETE' })
      setMessage('Server deleted.')
      await loadServers()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to delete server')
    }
  }

  return (
    <div className="stack">
      <section className="dashboard-hero glass-card">
        <div>
          <p className="eyebrow">Servers</p>
          <h1>Manage your game servers.</h1>
          <p className="hero-text">Create, configure, and monitor your Calagopus servers.</p>
        </div>
      </section>

      {message && <div className="glass-card notice">{message}</div>}

      {loading ? (
        <div className="glass-card">Loading servers...</div>
      ) : (
        <section className="dashboard-grid">
          <article className="glass-card panel">
            <h3>Your Servers ({servers.length})</h3>
            {servers.map((server) => (
              <button
                key={server.id}
                onClick={() => setSelectedServerId(server.calagopus_uuid)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  background: selectedServer?.id === server.id ? 'rgba(100, 240, 200, 0.1)' : 'transparent',
                  border: '1px solid ' + (selectedServer?.id === server.id ? 'rgba(100, 240, 200, 0.3)' : 'transparent'),
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'inherit',
                }}
              >
                <strong>{server.name}</strong>
                <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                  {server.cpu_limit}% CPU • {server.memory_limit}MB RAM
                </div>
              </button>
            ))}
          </article>

          {selectedServer && (
            <article className="glass-card panel">
              <h3>{selectedServer.name}</h3>
              <div style={{ marginBottom: '1rem' }}>
                <p>
                  <strong>Created:</strong> {formatDate(selectedServer.created_at)}
                </p>
                <p>
                  <strong>Status:</strong> {selectedServer.is_suspended ? 'Suspended' : 'Active'}
                </p>
              </div>
              <form onSubmit={handleUpdate}>
                <label>
                  Name
                  <input
                    value={updateForm.name}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setUpdateForm({ ...updateForm, name: e.target.value })
                    }
                    className="input"
                  />
                </label>
                <label>
                  CPU Limit (%)
                  <input
                    type="number"
                    value={updateForm.cpu_limit}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setUpdateForm({ ...updateForm, cpu_limit: parseInt(e.target.value) })
                    }
                    className="input"
                  />
                </label>
                <label>
                  Memory (MB)
                  <input
                    type="number"
                    value={updateForm.memory_limit}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setUpdateForm({ ...updateForm, memory_limit: parseInt(e.target.value) })
                    }
                    className="input"
                  />
                </label>
                <button type="submit" className="button button-primary">
                  Save
                </button>
                <button type="button" onClick={deleteServer} className="button button-danger">
                  Delete
                </button>
              </form>
            </article>
          )}

          <article className="glass-card panel">
            <h3>Create Server</h3>
            <form onSubmit={handleCreate}>
              <label>
                Server Name
                <input
                  value={createForm.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  className="input"
                />
              </label>
              <label>
                Egg UUID
                <input
                  value={createForm.egg_uuid}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCreateForm({ ...createForm, egg_uuid: e.target.value })
                  }
                  className="input"
                />
              </label>
              <button type="submit" className="button button-primary">
                Create
              </button>
            </form>
          </article>
        </section>
      )}
    </div>
  )
}
