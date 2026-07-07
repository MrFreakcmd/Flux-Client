import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { useAuth } from './context/AuthContext'
import { PageLoader } from './components/LazyPage'

// Lazy load all pages for code splitting
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ServersPage = lazy(() => import('./pages/ServersPage'))
const StorePage = lazy(() => import('./pages/StorePage'))
const BillingPage = lazy(() => import('./pages/BillingPage'))
const EarnPage = lazy(() => import('./pages/EarnPage'))
const CommunityPage = lazy(() => import('./pages/CommunityPage'))
const ImagesPage = lazy(() => import('./pages/ImagesPage'))
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'))
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage'))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'))
const AdminUserDetailsPage = lazy(() => import('./pages/AdminUserDetailsPage'))
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'))
const LandingPage = lazy(() => import('./pages/LandingPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

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
      <Route
        path="/"
        element={
          token ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Suspense fallback={<PageLoader />}>
              <LandingPage />
            </Suspense>
          )
        }
      />

      <Route
        path="/auth/callback"
        element={
          <Suspense fallback={<PageLoader />}>
            <AuthCallbackPage />
          </Suspense>
        }
      />

      <Route element={<RequireAuth />}>
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<PageLoader />}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route
          path="/servers"
          element={
            <Suspense fallback={<PageLoader />}>
              <ServersPage />
            </Suspense>
          }
        />
        <Route
          path="/servers/:serverId"
          element={
            <Suspense fallback={<PageLoader />}>
              <ServersPage />
            </Suspense>
          }
        />
        <Route
          path="/store"
          element={
            <Suspense fallback={<PageLoader />}>
              <StorePage />
            </Suspense>
          }
        />
        <Route
          path="/billing"
          element={
            <Suspense fallback={<PageLoader />}>
              <BillingPage />
            </Suspense>
          }
        />
        <Route
          path="/earn"
          element={
            <Suspense fallback={<PageLoader />}>
              <EarnPage />
            </Suspense>
          }
        />
        <Route
          path="/community"
          element={
            <Suspense fallback={<PageLoader />}>
              <CommunityPage />
            </Suspense>
          }
        />
        <Route
          path="/images"
          element={
            <Suspense fallback={<PageLoader />}>
              <ImagesPage />
            </Suspense>
          }
        />
        <Route
          path="/announcements"
          element={
            <Suspense fallback={<PageLoader />}>
              <AnnouncementsPage />
            </Suspense>
          }
        />
        <Route
          path="/account"
          element={
            <Suspense fallback={<PageLoader />}>
              <AccountPage />
            </Suspense>
          }
        />
      </Route>

      <Route element={<RequireAdmin />}>
        <Route
          path="/admin/dashboard"
          element={
            <Suspense fallback={<PageLoader />}>
              <AdminDashboardPage />
            </Suspense>
          }
        />
        <Route
          path="/admin/users"
          element={
            <Suspense fallback={<PageLoader />}>
              <AdminUsersPage />
            </Suspense>
          }
        />
        <Route
          path="/admin/users/:userId"
          element={
            <Suspense fallback={<PageLoader />}>
              <AdminUserDetailsPage />
            </Suspense>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <Suspense fallback={<PageLoader />}>
              <AdminSettingsPage />
            </Suspense>
          }
        />
      </Route>

      <Route
        path="*"
        element={
          <Suspense fallback={<PageLoader />}>
            <NotFoundPage />
          </Suspense>
        }
      />
    </Routes>
  )
}
