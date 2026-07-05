import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

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
  const [prices, setPrices] = useState(null)
  const [servers, setServers] = useState([])
  const [globalForm, setGlobalForm] = useState(defaultGlobalForm)
  const [serverForm, setServerForm] = useState(defaultServerForm)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let active = true

    async function loadStore() {
      try {
        const [priceData, serverData] = await Promise.all([
          apiFetch('/api/store/prices'),
          apiFetch('/api/servers'),
        ])
        if (active) {
          setPrices(priceData)
          setServers(serverData)
          setServerForm((current) => ({
            ...current,
            server_uuid: serverData[0]?.calagopus_uuid || '',
          }))
        }
      } catch (err) {
        if (active) {
          setMessage(err.message)
        }
      }
    }

    loadStore()

    return () => {
      active = false
    }
  }, [])

  async function buyGlobalLimits(event) {
    event.preventDefault()
    setMessage(null)

    try {
      const query = new URLSearchParams(
        Object.entries(globalForm).reduce((acc, [key, value]) => {
          acc[key] = String(Number(value))
          return acc
        }, {})
      )
      const result = await apiFetch(`/api/store/buy-limits?${query.toString()}`, { method: 'POST' })
      setMessage(`Upgrade complete. Remaining coins: ${result.remaining_coins}`)
    } catch (err) {
      setMessage(err.message)
    }
  }

  async function configureServer(event) {
    event.preventDefault()
    setMessage(null)

    try {
      const result = await apiFetch('/api/store/configure-server', {
        method: 'POST',
        body: {
          ...serverForm,
          cpu_delta: Number(serverForm.cpu_delta),
          memory_delta: Number(serverForm.memory_delta),
          disk_delta: Number(serverForm.disk_delta),
          slots_delta: Number(serverForm.slots_delta),
        },
      })
      setMessage(`Server updated: ${result.server.cpu}% CPU / ${result.server.memory} MB / ${result.server.disk} MB`)
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <div className="stack">
      <section className="glass-card panel">
        <p className="eyebrow">Store</p>
        <h1>Upgrade limits with coins.</h1>
        {message ? <div className="notice">{message}</div> : null}
        <div className="prices-grid">
          {prices ? (
            Object.entries(prices).map(([key, value]) => (
              <div className="price-pill" key={key}>
                <span>{key.replaceAll('_', ' ')}</span>
                <strong>{String(value)} coins</strong>
              </div>
            ))
          ) : (
            <div className="price-pill">
              <span>Store</span>
              <strong>Loading pricing...</strong>
            </div>
          )}
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Global</p>
              <h3>Buy more pool capacity</h3>
            </div>
          </div>
          <form className="form-grid" onSubmit={buyGlobalLimits}>
            {['cpu_delta', 'memory_delta', 'disk_delta', 'slots_delta'].map((field) => (
              <label className="field" key={field}>
                <span>{field.replace('_', ' ')}</span>
                <input
                  className="input"
                  type="number"
                  step={field === 'cpu_delta' ? 10 : field === 'memory_delta' ? 128 : field === 'disk_delta' ? 1000 : 1}
                  min="0"
                  value={globalForm[field]}
                  onChange={(event) => setGlobalForm({ ...globalForm, [field]: event.target.value })}
                />
              </label>
            ))}
            <button className="button button-primary" type="submit">
              Spend coins
            </button>
          </form>
        </article>

        <article className="glass-card panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Server</p>
              <h3>Reconfigure an existing server</h3>
            </div>
          </div>
          <form className="form-grid" onSubmit={configureServer}>
            <label className="field">
              <span>Server</span>
              <select
                className="input"
                value={serverForm.server_uuid}
                onChange={(event) => setServerForm({ ...serverForm, server_uuid: event.target.value })}
              >
                {servers.map((server) => (
                  <option key={server.id} value={server.calagopus_uuid}>
                    {server.name}
                  </option>
                ))}
              </select>
            </label>
            {['cpu_delta', 'memory_delta', 'disk_delta', 'slots_delta'].map((field) => (
              <label className="field" key={field}>
                <span>{field.replace('_', ' ')}</span>
                <input
                  className="input"
                  type="number"
                  step={field === 'cpu_delta' ? 10 : field === 'memory_delta' ? 128 : field === 'disk_delta' ? 1000 : 1}
                  value={serverForm[field]}
                  onChange={(event) => setServerForm({ ...serverForm, [field]: event.target.value })}
                />
              </label>
            ))}
            <button className="button button-primary" type="submit">
              Apply changes
            </button>
          </form>
        </article>
      </section>
    </div>
  )
}
