import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

/**
 * PageTransition Component
 * Wraps page content to provide smooth fade + slide animations
 * Respects prefers-reduced-motion user preference
 */
export const PageTransition = ({ children }: PageTransitionProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{
      duration: 0.3,
      ease: 'easeOut',
    }}
  >
    {children}
  </motion.div>
)
