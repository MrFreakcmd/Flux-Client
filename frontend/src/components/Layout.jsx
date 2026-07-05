import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_BASE_URL } from '../lib/api'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/servers', label: 'Servers' },
  { to: '/store', label: 'Store' },
  { to: '/support', label: 'Support' },
  { to: '/billing', label: 'Billing' },
]

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="app-shell">
      <aside className="sidebar glass-card">
        <div className="brand-lockup">
          <div className="brand-mark">F</div>
          <div>
            <p className="eyebrow">Flux Client</p>
            <h1>Calagopus Dashboard</h1>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-pill">
            <strong>{user?.username || 'Signed in user'}</strong>
            <span>{user?.email || 'Connected to dashboard'}</span>
          </div>
          <button className="button button-ghost" type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="app-main">
        <header className="topbar glass-card">
          <div>
            <p className="eyebrow">Backend</p>
            <h2>{API_BASE_URL.replace(/^https?:\/\//, '')}</h2>
          </div>
          <div className="topbar-meta">
            <span className="status-chip online">Live session</span>
            <span className="status-chip neutral">{user?.is_admin ? 'Admin' : 'Client'}</span>
          </div>
        </header>

        <section className="page-content">
          <Outlet />
        </section>
      </main>
    </div>
  )
}
