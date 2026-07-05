import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../lib/api'

function normalizeSocketUrl(rawUrl, token) {
  if (!rawUrl) {
    return null
  }

  let socketUrl = rawUrl
  if (socketUrl.startsWith('https://')) {
    socketUrl = socketUrl.replace('https://', 'wss://')
  } else if (socketUrl.startsWith('http://')) {
    socketUrl = socketUrl.replace('http://', 'ws://')
  }

  if (token && !socketUrl.includes('token=')) {
    const separator = socketUrl.includes('?') ? '&' : '?'
    socketUrl = `${socketUrl}${separator}token=${encodeURIComponent(token)}`
  }

  return socketUrl
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
        const socketUrl = normalizeSocketUrl(
          info?.socket || info?.websocket || info?.url || info?.connection_url || info?.wss,
          info?.token || info?.authToken || info?.authorization?.token
        )

        if (!socketUrl) {
          setStatus('ready')
          pushLine('WebSocket details loaded, but no socket URL was returned by the panel.')
          return
        }

        const socket = new WebSocket(socketUrl)
        socketRef.current = socket

        socket.onopen = () => {
          if (cancelled) {
            return
          }
          setStatus('connected')
          pushLine(`[connected] ${socketUrl}`)
        }

        socket.onmessage = (event) => {
          if (!cancelled) {
            pushLine(String(event.data))
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
      socketRef.current.send(text)
    } else {
      pushLine('[offline] Console socket is not open.')
    }

    setCommand('')
  }

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
        <button className="button button-primary" type="submit">
          Send
        </button>
      </form>

      {connectionInfo ? (
        <pre className="terminal-meta">{JSON.stringify(connectionInfo, null, 2)}</pre>
      ) : null}
    </section>
  )
}
