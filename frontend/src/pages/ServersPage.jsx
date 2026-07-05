import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Terminal from '../components/Terminal'
import { apiFetch } from '../lib/api'

const defaultForm = {
  name: '',
  egg_uuid: '',
  node_uuid: '',
  cpu_limit: 100,
  memory_limit: 2048,
  disk_limit: 10000,
  slots: 1,
}

export default function ServersPage() {
  const params = useParams()
  const [servers, setServers] = useState([])
  const [selectedServerId, setSelectedServerId] = useState(params.serverId || null)
  const [form, setForm] = useState(defaultForm)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadServers() {
    setLoading(true)
    try {
      const data = await apiFetch('/api/servers')
      setServers(data)
      if (!selectedServerId && data[0]?.calagopus_uuid) {
        setSelectedServerId(data[0].calagopus_uuid)
      }
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.serverId])

  useEffect(() => {
    if (params.serverId) {
      setSelectedServerId(params.serverId)
    }
  }, [params.serverId])

  const selectedServer = servers.find((server) => server.calagopus_uuid === selectedServerId) || null

  async function handleCreate(event) {
    event.preventDefault()
    setMessage(null)

    try {
      await apiFetch('/api/servers/create', {
        method: 'POST',
        body: {
          ...form,
          cpu_limit: Number(form.cpu_limit),
          memory_limit: Number(form.memory_limit),
          disk_limit: Number(form.disk_limit),
          slots: Number(form.slots),
        },
      })
      setMessage('Server created successfully.')
      setForm(defaultForm)
      await loadServers()
    } catch (err) {
      setMessage(err.message)
    }
  }

  async function sendPowerAction(serverUuid, action) {
    try {
      await apiFetch(`/api/servers/${serverUuid}/power?action=${encodeURIComponent(action)}`, {
        method: 'POST',
      })
      setMessage(`Sent ${action} command.`)
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
              <input
                className="input"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Egg UUID</span>
              <input
                className="input"
                value={form.egg_uuid}
                onChange={(event) => setForm({ ...form, egg_uuid: event.target.value })}
                placeholder="Paste from Calagopus"
                required
              />
            </label>
            <label className="field">
              <span>Node UUID</span>
              <input
                className="input"
                value={form.node_uuid}
                onChange={(event) => setForm({ ...form, node_uuid: event.target.value })}
                placeholder="Paste from Calagopus"
                required
              />
            </label>
            <label className="field">
              <span>CPU %</span>
              <input
                className="input"
                type="number"
                min="10"
                max="800"
                step="10"
                value={form.cpu_limit}
                onChange={(event) => setForm({ ...form, cpu_limit: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Memory MB</span>
              <input
                className="input"
                type="number"
                min="128"
                max="32768"
                step="128"
                value={form.memory_limit}
                onChange={(event) => setForm({ ...form, memory_limit: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Disk MB</span>
              <input
                className="input"
                type="number"
                min="512"
                max="1048576"
                step="512"
                value={form.disk_limit}
                onChange={(event) => setForm({ ...form, disk_limit: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Slots</span>
              <input
                className="input"
                type="number"
                min="1"
                max="10"
                step="1"
                value={form.slots}
                onChange={(event) => setForm({ ...form, slots: event.target.value })}
                required
              />
            </label>
            <button className="button button-primary" type="submit">
              Provision server
            </button>
          </form>
        </article>

        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Console</p>
              <h3>Live terminal</h3>
            </div>
          </div>
          {selectedServer ? (
            <Terminal serverUuid={selectedServer.calagopus_uuid} title={selectedServer.name} />
          ) : (
            <p className="muted">Select a server card to open its terminal.</p>
          )}
        </article>
      </section>
    </div>
  )
}
