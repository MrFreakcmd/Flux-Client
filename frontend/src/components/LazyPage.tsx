/**
 * Lazy Page Loading Wrapper
 * Code splitting utility for route-based page loading
 */

import { Suspense, ReactNode } from 'react'
import { motion } from 'framer-motion'

/**
 * PageLoader
 * Loading fallback component shown while page chunk is being loaded
 */
export const PageLoader = () => (
  <motion.div
    className="page-loader"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontSize: 'var(--font-size-lg)',
      color: 'var(--color-neutral-500)',
    }}
  >
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: '2rem',
          height: '2rem',
          border: '3px solid var(--color-neutral-200)',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 1rem',
        }}
      />
      <p>Loading page...</p>
    </div>
  </motion.div>
)

interface LazyPageProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * LazyPage
 * Wraps dynamically imported pages with Suspense boundary
 *
 * Usage:
 * const DashboardPage = lazy(() => import('./pages/DashboardPage'))
 *
 * <LazyPage>
 *   <DashboardPage />
 * </LazyPage>
 */
export const LazyPage = ({ children, fallback = <PageLoader /> }: LazyPageProps) => (
  <Suspense fallback={fallback}>{children}</Suspense>
)
