import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../lib/api'

function normalizeSocketUrl(rawUrl) {
  if (!rawUrl) {
    return null
  }

  let socketUrl = rawUrl
  if (socketUrl.startsWith('https://')) {
    socketUrl = socketUrl.replace('https://', 'wss://')
  } else if (socketUrl.startsWith('http://')) {
    socketUrl = socketUrl.replace('http://', 'ws://')
  }

  return socketUrl
}

function getSocketDetails(info) {
  const payload = info?.data || info || {}
  return {
    url: normalizeSocketUrl(payload.url || payload.socket || payload.websocket || payload.connection_url || payload.wss),
    token: payload.token || payload.authToken || payload.authorization?.token,
  }
}

function formatSocketMessage(value) {
  try {
    const payload = JSON.parse(value)
    if (payload.event && Array.isArray(payload.args)) {
      return `[${payload.event}] ${payload.args.join('\n')}`
    }
  } catch {
    return value
  }

  return value
}

export default function Terminal({ serverUuid, title = 'Terminal' }) {
  const [lines, setLines] = useState(['Ready to connect.'])
  const [command, setCommand] = useState('')
  const [status, setStatus] = useState('idle')
  const [connectionInfo, setConnectionInfo] = useState(null)
  const socketRef = useRef(null)
  const endRef = useRef(null)

  function pushLine(line) {
    setLines((current) => [...current.slice(-199), line])
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  useEffect(() => {
    if (!serverUuid) {
      setLines(['Select a server to open the console.'])
      setStatus('idle')
      setConnectionInfo(null)
      return undefined
    }

    let cancelled = false

    async function connect() {
      setStatus('connecting')
      pushLine(`Connecting to ${serverUuid}...`)

      try {
        const info = await apiFetch(`/api/servers/${serverUuid}/websocket`)
        if (cancelled) {
          return
        }

        setConnectionInfo(info)
        const socketDetails = getSocketDetails(info)

        if (!socketDetails.url) {
          setStatus('ready')
          pushLine('WebSocket details loaded, but no socket URL was returned by the panel.')
          return
        }

        const socket = new WebSocket(socketDetails.url)
        socketRef.current = socket

        socket.onopen = () => {
          if (cancelled) {
            return
          }
          setStatus('connected')
          if (socketDetails.token) {
            socket.send(JSON.stringify({ event: 'auth', args: [socketDetails.token] }))
          }
          pushLine('[connected] Console socket opened.')
        }

        socket.onmessage = (event) => {
          if (!cancelled) {
            pushLine(formatSocketMessage(String(event.data)))
          }
        }

        socket.onerror = () => {
          if (!cancelled) {
            setStatus('error')
            pushLine('[error] The console connection reported an error.')
          }
        }

        socket.onclose = () => {
          if (!cancelled) {
            setStatus('closed')
            pushLine('[closed] The console connection was closed.')
          }
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error')
          pushLine(`[error] ${err.message}`)
        }
      }
    }

    connect()

    return () => {
      cancelled = true
      if (socketRef.current && socketRef.current.readyState <= WebSocket.OPEN) {
        socketRef.current.close()
      }
      socketRef.current = null
    }
  }, [serverUuid])

  function sendCommand(event) {
    event.preventDefault()
    const text = command.trim()
    if (!text) {
      return
    }

    pushLine(`> ${text}`)

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event: 'send command', args: [text] }))
    } else {
      pushLine('[offline] Console socket is not open.')
    }

    setCommand('')
  }

  const canSend = status === 'connected' && Boolean(command.trim())

  return (
    <section className="glass-card terminal-panel">
      <div className="terminal-header">
        <div>
          <p className="eyebrow">{title}</p>
          <h3>{serverUuid || 'No server selected'}</h3>
        </div>
        <span className={`status-chip ${status === 'connected' ? 'online' : status === 'error' ? 'danger' : 'neutral'}`}>
          {status}
        </span>
      </div>

      <div className="terminal-body">
        <div className="terminal-lines">
          {lines.map((line, index) => (
            <div key={`${index}-${line}`} className="terminal-line">
              {line}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      <form className="terminal-input-row" onSubmit={sendCommand}>
        <input
          className="input terminal-input"
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          placeholder="Type a console command"
          aria-label="Terminal command input"
        />
        <button className="button button-primary" type="submit" disabled={!canSend}>
          Send
        </button>
      </form>

      {connectionInfo ? (
        <p className="terminal-meta">
          Socket details loaded from Calagopus. Status: {status}.
        </p>
      ) : null}
    </section>
  )
}
