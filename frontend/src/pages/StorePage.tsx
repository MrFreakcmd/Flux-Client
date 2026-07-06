import { useEffect, useState, FormEvent, ChangeEvent } from 'react'
import { apiFetch } from '../lib/api'

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
        }
      } catch (err) {
        if (active) {
          setMessage(err instanceof Error ? err.message : 'Failed to load store')
        }
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
    try {
      await apiFetch('/api/store/upgrade-limits', {
        method: 'POST',
        body: globalForm,
      })
      setMessage('Global limits upgraded successfully!')
      setGlobalForm(defaultGlobalForm)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to upgrade limits')
    }
  }

  async function buyServerLimits(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setMessage(null)
    try {
      await apiFetch('/api/store/upgrade-server', {
        method: 'POST',
        body: serverForm,
      })
      setMessage('Server limits upgraded successfully!')
      setServerForm(defaultServerForm)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to upgrade server')
    }
  }

  return (
    <div className="stack">
      <section className="dashboard-hero glass-card">
        <div>
          <p className="eyebrow">Store</p>
          <h1>Upgrade your infrastructure.</h1>
          <p className="hero-text">Purchase additional CPU, memory, disk, and server slots.</p>
        </div>
      </section>

      {message && <div className="glass-card notice">{message}</div>}

      <section className="dashboard-grid">
        <article className="glass-card panel">
          <h3>Pricing</h3>
          {prices?.map((price) => (
            <div key={price.id} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>{price.name}</strong>
                  <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>{price.description}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>{price.price} {price.currency}</strong>
                </div>
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>
                +{price.resources.cpu}% CPU, +{price.resources.memory}MB RAM, +{price.resources.disk}MB Disk
              </div>
            </div>
          ))}
        </article>

        <article className="glass-card panel">
          <h3>Global Upgrade</h3>
          <form onSubmit={buyGlobalLimits}>
            <label>
              CPU Delta
              <input
                type="number"
                value={globalForm.cpu_delta}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setGlobalForm({ ...globalForm, cpu_delta: parseInt(e.target.value) })
                }
              />
            </label>
            <label>
              Memory Delta (MB)
              <input
                type="number"
                value={globalForm.memory_delta}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setGlobalForm({ ...globalForm, memory_delta: parseInt(e.target.value) })
                }
              />
            </label>
            <button type="submit" className="button button-primary">
              Upgrade
            </button>
          </form>
        </article>
      </section>

      <section className="glass-card panel">
        <h3>Server-Specific Upgrade</h3>
        <form onSubmit={buyServerLimits}>
          <select
            value={serverForm.server_uuid}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setServerForm({ ...serverForm, server_uuid: e.target.value })
            }
          >
            {servers.map((server) => (
              <option key={server.id} value={server.calagopus_uuid}>
                {server.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="CPU Delta"
            value={serverForm.cpu_delta}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setServerForm({ ...serverForm, cpu_delta: parseInt(e.target.value) })
            }
          />
          <button type="submit" className="button button-primary">
            Upgrade Server
          </button>
        </form>
      </section>
    </div>
  )
}
