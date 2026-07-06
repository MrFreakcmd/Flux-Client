import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { useAuth } from './context/AuthContext'
import AccountPage from './pages/AccountPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminUserDetailsPage from './pages/AdminUserDetailsPage'
import AnnouncementsPage from './pages/AnnouncementsPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import BillingPage from './pages/BillingPage'
import CommunityPage from './pages/CommunityPage'
import DashboardPage from './pages/DashboardPage'
import EarnPage from './pages/EarnPage'
import ImagesPage from './pages/ImagesPage'
import LandingPage from './pages/LandingPage'
import NotFoundPage from './pages/NotFoundPage'
import ServersPage from './pages/ServersPage'
import StorePage from './pages/StorePage'

function RequireAuth() {
  const { token, bootstrapping } = useAuth()
  const location = useLocation()

  if (bootstrapping) {
    return <div className="splash-screen">Warming up the dashboard...</div>
  }

  if (!token) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  return <Layout />
}

function RequireAdmin() {
  const { token, bootstrapping, user } = useAuth()
  const location = useLocation()

  if (bootstrapping) {
    return <div className="splash-screen">Warming up the dashboard...</div>
  }

  if (!token) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  if (!user?.is_admin) {
    return <Navigate to="/dashboard" replace state={{ from: location }} />
  }

  return <Layout />
}

export default function App() {
  const { token } = useAuth()

  return (
    <Routes>
      <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/servers" element={<ServersPage />} />
        <Route path="/servers/:serverId" element={<ServersPage />} />
        <Route path="/store" element={<StorePage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/earn" element={<EarnPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/images" element={<ImagesPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/account" element={<AccountPage />} />
      </Route>
      <Route element={<RequireAdmin />}>
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/users/:userId" element={<AdminUserDetailsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
