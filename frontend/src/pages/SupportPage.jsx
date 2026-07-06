import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const ticketDefaults = {
  subject: '',
  department: 'technical',
  message: '',
}

const replyDefaults = {
  message: '',
  support_pin: '',
}

export default function SupportPage() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [ticketForm, setTicketForm] = useState(ticketDefaults)
  const [replyForm, setReplyForm] = useState(replyDefaults)
  const [message, setMessage] = useState(null)

  async function loadTickets() {
    const data = await apiFetch('/api/tickets')
    setTickets(data)
    if (!selectedTicket && data[0]) {
      setSelectedTicket(data[0])
    }
  }

  useEffect(() => {
    loadTickets().catch((err) => setMessage(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedTicket) {
      return undefined
    }

    let active = true

    async function loadTicketDetail() {
      try {
        const detail = await apiFetch(`/api/tickets/${selectedTicket.id}`)
        if (active) {
          setSelectedTicket(detail)
        }
      } catch (err) {
        if (active) {
          setMessage(err.message)
        }
      }
    }

    loadTicketDetail()

    return () => {
      active = false
    }
  }, [selectedTicket?.id])

  async function createTicket(event) {
    event.preventDefault()
    try {
      const ticket = await apiFetch('/api/tickets', {
        method: 'POST',
        body: ticketForm,
      })
      setMessage(`Ticket created with support PIN ${ticket.support_pin}`)
      setTicketForm(ticketDefaults)
      await loadTickets()
      setSelectedTicket(ticket)
    } catch (err) {
      setMessage(err.message)
    }
  }

  async function replyToTicket(event) {
    event.preventDefault()
    if (!selectedTicket) {
      return
    }

    try {
      const updated = await apiFetch(`/api/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        body: replyForm,
      })
      setMessage('Ticket reply sent.')
      setReplyForm(replyDefaults)
      setSelectedTicket(updated)
      await loadTickets()
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <div className="stack">
      <section className="dashboard-grid">
        <article className="glass-card panel">
          <p className="eyebrow">Support</p>
          <h1>Open a ticket</h1>
          <form className="form-grid" onSubmit={createTicket}>
            <label className="field">
              <span>Subject</span>
              <input
                className="input"
                value={ticketForm.subject}
                onChange={(event) => setTicketForm({ ...ticketForm, subject: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Department</span>
              <select
                className="input"
                value={ticketForm.department}
                onChange={(event) => setTicketForm({ ...ticketForm, department: event.target.value })}
              >
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="general">General</option>
              </select>
            </label>
            <label className="field full-width">
              <span>Message</span>
              <textarea
                className="input textarea"
                rows="6"
                value={ticketForm.message}
                onChange={(event) => setTicketForm({ ...ticketForm, message: event.target.value })}
                required
              />
            </label>
            <button className="button button-primary" type="submit">
              Create ticket
            </button>
          </form>
        </article>

        <article className="glass-card panel">
          <p className="eyebrow">Ticket queue</p>
          <h3>{tickets.length} tickets</h3>
          <div className="list-stack">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                className={`list-row selectable${selectedTicket?.id === ticket.id ? ' selected' : ''}`}
                type="button"
                onClick={() => setSelectedTicket(ticket)}
              >
                <div>
                  <strong>{ticket.subject}</strong>
                  <span>
                    {ticket.department} - {ticket.status}
                  </span>
                </div>
                <span className="status-chip neutral">{ticket.support_pin ? 'PIN set' : 'no pin'}</span>
              </button>
            ))}
            {!tickets.length ? <p className="muted">No tickets yet.</p> : null}
          </div>
        </article>
      </section>

      <section className="glass-card panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Conversation</p>
            <h3>{selectedTicket?.subject || 'Select a ticket'}</h3>
          </div>
          {selectedTicket ? <span className="status-chip neutral">{selectedTicket.status}</span> : null}
        </div>

        {message ? <div className="notice">{message}</div> : null}

        {selectedTicket ? (
          <>
            <div className="ticket-thread">
              {(selectedTicket.messages || []).map((entry) => (
                <article className={`ticket-message ${entry.sender_type}`} key={entry.id}>
                  <header>
                    <strong>{entry.sender_type}</strong>
                    <span>{entry.created_at}</span>
                  </header>
                  <p>{entry.message}</p>
                </article>
              ))}
            </div>

            <form className="form-grid" onSubmit={replyToTicket}>
              <label className="field full-width">
                <span>Reply</span>
                <textarea
                  className="input textarea"
                  rows="5"
                  value={replyForm.message}
                  onChange={(event) => setReplyForm({ ...replyForm, message: event.target.value })}
                  required
                />
              </label>

              {user?.is_admin ? (
                <label className="field">
                  <span>Support PIN</span>
                  <input
                    className="input"
                    value={replyForm.support_pin}
                    onChange={(event) => setReplyForm({ ...replyForm, support_pin: event.target.value })}
                    placeholder="Required for admin replies"
                  />
                </label>
              ) : null}

              <button className="button button-primary" type="submit">
                Send reply
              </button>
            </form>
          </>
        ) : (
          <p className="muted">Pick a ticket to inspect the conversation.</p>
        )}
      </section>
    </div>
  )
}
