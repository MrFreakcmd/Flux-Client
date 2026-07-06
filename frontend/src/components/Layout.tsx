import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiDisplayHost } from '../lib/api'

interface NavItem {
  to: string
  label: string
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/servers', label: 'Servers' },
  { to: '/store', label: 'Store' },
  { to: '/earn', label: 'Earn' },
  { to: '/community', label: 'Community' },
  { to: '/images', label: 'Images' },
  { to: '/announcements', label: 'News' },
  { to: '/billing', label: 'Billing' },
  { to: '/account', label: 'Account' },
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

          {user?.is_admin && (
            <>
              <div className="nav-divider" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0.75rem 0' }} />
              <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.5, padding: '0 0.5rem', margin: '0.25rem 0' }}>Admin</p>
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
              >
                Admin Dashboard
              </NavLink>
              <NavLink
                to="/admin/users"
                className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
              >
                User Management
              </NavLink>
            </>
          )}
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
            <h2>{apiDisplayHost()}</h2>
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
