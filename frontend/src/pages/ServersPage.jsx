import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Terminal from '../components/Terminal'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

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

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : 'No lease'
}

export default function ServersPage() {
  const params = useParams()
  const { refreshUser } = useAuth()
  const [servers, setServers] = useState([])
  const [selectedServerId, setSelectedServerId] = useState(params.serverId || null)
  const [createForm, setCreateForm] = useState(defaultCreateForm)
  const [updateForm, setUpdateForm] = useState(defaultUpdateForm)
  const [files, setFiles] = useState([])
  const [backups, setBackups] = useState([])
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadServers() {
    setLoading(true)
    try {
      const data = await apiFetch('/api/servers')
      setServers(data)
      const nextSelected = params.serverId || selectedServerId || data[0]?.calagopus_uuid || null
      setSelectedServerId(nextSelected)
    } catch (err) {
      setMessage(err.message)
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
    setFiles([])
    setBackups([])
  }, [selectedServer?.calagopus_uuid])

  async function handleCreate(event) {
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
      setMessage(err.message)
    }
  }

  async function handleUpdate(event) {
    event.preventDefault()
    if (!selectedServer) return
    setMessage(null)
    try {
      await apiFetch(`/api/servers/${selectedServer.calagopus_uuid}`, {
        method: 'PATCH',
        body: {
          ...updateForm,
          cpu_limit: Number(updateForm.cpu_limit),
          memory_limit: Number(updateForm.memory_limit),
          disk_limit: Number(updateForm.disk_limit),
          slots: Number(updateForm.slots),
        },
      })
      setMessage('Server updated.')
      await loadServers()
    } catch (err) {
      setMessage(err.message)
    }
  }

  async function sendPowerAction(serverUuid, action) {
    try {
      await apiFetch(`/api/servers/${serverUuid}/power?action=${encodeURIComponent(action)}`, { method: 'POST' })
      setMessage(`Sent ${action} command.`)
    } catch (err) {
      setMessage(err.message)
    }
  }

  async function renewServer() {
    if (!selectedServer) return
    setMessage(null)
    try {
      const data = await apiFetch(`/api/servers/${selectedServer.calagopus_uuid}/renew`, { method: 'POST' })
      setMessage(`Server renewed. Remaining coins: ${data.remaining_coins}`)
      await Promise.all([loadServers(), refreshUser()])
    } catch (err) {
      setMessage(err.message)
    }
  }

  async function deleteServer() {
    if (!selectedServer) return
    const confirmed = window.confirm(`Delete ${selectedServer.name}? This removes it from Calagopus too.`)
    if (!confirmed) return
    setMessage(null)
    try {
      await apiFetch(`/api/servers/${selectedServer.calagopus_uuid}`, { method: 'DELETE' })
      setSelectedServerId(null)
      setMessage('Server deleted.')
      await loadServers()
    } catch (err) {
      setMessage(err.message)
    }
  }

  async function loadFiles() {
    if (!selectedServer) return
    try {
      const data = await apiFetch(`/api/servers/${selectedServer.calagopus_uuid}/files`)
      const list = data.files?.data || data.data || data.files || []
      setFiles(Array.isArray(list) ? list : [])
    } catch (err) {
      setMessage(err.message)
    }
  }

  async function loadBackups() {
    if (!selectedServer) return
    try {
      const data = await apiFetch(`/api/servers/${selectedServer.calagopus_uuid}/backups`)
      const list = data.backups?.data || data.data || data.backups || []
      setBackups(Array.isArray(list) ? list : [])
    } catch (err) {
      setMessage(err.message)
    }
  }

  async function createBackup() {
    if (!selectedServer) return
    try {
      await apiFetch(`/api/servers/${selectedServer.calagopus_uuid}/backups`, { method: 'POST' })
      setMessage('Backup requested.')
      await loadBackups()
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <div className="stack">
      <section className="glass-card panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Servers</p>
            <h1>Your fleet</h1>
          </div>
          <span className="status-chip neutral">{loading ? 'Loading' : `${servers.length} servers`}</span>
        </div>
        {message ? <div className="notice">{message}</div> : null}
        <div className="server-grid">
          {servers.map((server) => (
            <article
              className={`glass-card server-card${selectedServerId === server.calagopus_uuid ? ' is-selected' : ''}`}
              key={server.id}
              onClick={() => setSelectedServerId(server.calagopus_uuid)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  setSelectedServerId(server.calagopus_uuid)
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="server-card-top">
                <div>
                  <p className="eyebrow">{server.is_suspended ? 'Suspended' : 'Live'}</p>
                  <h3>{server.name}</h3>
                </div>
                <span className="status-chip neutral">{server.slots} slots</span>
              </div>
              <p className="muted">{server.calagopus_uuid}</p>
              <div className="server-metrics">
                <span>{server.cpu_limit}% CPU</span>
                <span>{server.memory_limit} MB</span>
                <span>{server.disk_limit} MB</span>
                <span>Expires {formatDate(server.expires_at)}</span>
              </div>
              <div className="button-row">
                {['start', 'restart', 'stop', 'kill'].map((action) => (
                  <button
                    key={action}
                    className="button button-ghost"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      sendPowerAction(server.calagopus_uuid, action)
                    }}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Provision</p>
              <h3>Create a server</h3>
            </div>
          </div>
          <form className="form-grid" onSubmit={handleCreate}>
            <label className="field">
              <span>Name</span>
              <input className="input" value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} required />
            </label>
            <label className="field">
              <span>Egg UUID</span>
              <input className="input" value={createForm.egg_uuid} onChange={(event) => setCreateForm({ ...createForm, egg_uuid: event.target.value })} required />
            </label>
            <label className="field">
              <span>Node UUID</span>
              <input className="input" value={createForm.node_uuid} onChange={(event) => setCreateForm({ ...createForm, node_uuid: event.target.value })} required />
            </label>
            {['cpu_limit', 'memory_limit', 'disk_limit', 'slots'].map((field) => (
              <label className="field" key={field}>
                <span>{field.replace('_', ' ')}</span>
                <input className="input" type="number" value={createForm[field]} onChange={(event) => setCreateForm({ ...createForm, [field]: event.target.value })} required />
              </label>
            ))}
            <button className="button button-primary" type="submit">Provision server</button>
          </form>
        </article>

        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Update</p>
              <h3>{selectedServer ? selectedServer.name : 'Select a server'}</h3>
            </div>
          </div>
          {selectedServer ? (
            <form className="form-grid" onSubmit={handleUpdate}>
              <label className="field">
                <span>Name</span>
                <input className="input" value={updateForm.name} onChange={(event) => setUpdateForm({ ...updateForm, name: event.target.value })} />
              </label>
              {['cpu_limit', 'memory_limit', 'disk_limit', 'slots'].map((field) => (
                <label className="field" key={field}>
                  <span>{field.replace('_', ' ')}</span>
                  <input className="input" type="number" value={updateForm[field]} onChange={(event) => setUpdateForm({ ...updateForm, [field]: event.target.value })} />
                </label>
              ))}
              <button className="button button-primary" type="submit">Save changes</button>
              <button className="button button-ghost" type="button" onClick={renewServer}>Renew server</button>
              <button className="button button-ghost" type="button" onClick={deleteServer}>Delete server</button>
            </form>
          ) : (
            <p className="muted">Select a server card to update it.</p>
          )}
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Console</p>
              <h3>Live terminal</h3>
            </div>
          </div>
          {selectedServer ? <Terminal serverUuid={selectedServer.calagopus_uuid} title={selectedServer.name} /> : <p className="muted">Select a server card to open its terminal.</p>}
        </article>

        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Files and backups</p>
              <h3>Inspect server storage</h3>
            </div>
            <div className="button-row tight">
              <button className="button button-ghost" type="button" onClick={loadFiles} disabled={!selectedServer}>Files</button>
              <button className="button button-ghost" type="button" onClick={loadBackups} disabled={!selectedServer}>Backups</button>
              <button className="button button-primary" type="button" onClick={createBackup} disabled={!selectedServer}>Create backup</button>
            </div>
          </div>
          <div className="list-stack">
            {files.map((file, index) => (
              <div className="list-row" key={file.uuid || file.name || index}>
                <div>
                  <strong>{file.name || file.path || 'File'}</strong>
                  <span>{file.size || file.mode || file.mime || 'No metadata'}</span>
                </div>
              </div>
            ))}
            {backups.map((backup, index) => (
              <div className="list-row" key={backup.uuid || backup.name || index}>
                <div>
                  <strong>{backup.name || backup.uuid || 'Backup'}</strong>
                  <span>{backup.created_at || backup.completed_at || 'Pending metadata'}</span>
                </div>
              </div>
            ))}
            {!files.length && !backups.length ? <p className="muted">Load files or backups to inspect this server.</p> : null}
          </div>
        </article>
      </section>
    </div>
  )
}
