import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { useAuth } from './context/AuthContext'
import AuthCallbackPage from './pages/AuthCallbackPage'
import BillingPage from './pages/BillingPage'
import DashboardPage from './pages/DashboardPage'
import LandingPage from './pages/LandingPage'
import NotFoundPage from './pages/NotFoundPage'
import ServersPage from './pages/ServersPage'
import StorePage from './pages/StorePage'
import SupportPage from './pages/SupportPage'

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
        <Route path="/support" element={<SupportPage />} />
        <Route path="/billing" element={<BillingPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
