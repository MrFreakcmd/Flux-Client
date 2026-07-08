import { motion } from 'framer-motion'
import clsx from 'clsx'
import styles from './Badge.module.css'
import { ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
type Size = 'sm' | 'md' | 'lg'
type Status = 'online' | 'offline' | 'idle' | 'busy'

interface BadgeProps {
  children: ReactNode
  variant?: Variant
  size?: Size
  status?: Status
  dot?: boolean
  animated?: boolean
  className?: string
}

/**
 * Badge Component
 * Displays labels, tags, status indicators, and color-coded information
 * Supports animated entrance and status-based styling with visual indicators
 */
export const Badge = ({
  children,
  variant = 'primary',
  size = 'md',
  status,
  dot = false,
  animated = true,
  className,
}: BadgeProps) => {
  const content = (
    <span
      className={clsx(
        styles.badge,
        styles[`variant-${variant}`],
        styles[`size-${size}`],
        status && styles[`status-${status}`],
        className
      )}
      data-status={status}
      role={status ? 'status' : 'label'}
    >
      {dot && status && (
        <span
          className={clsx(styles.dot, styles[`dot-${status}`])}
          aria-hidden="true"
        />
      )}
      <span className={styles.label}>{children}</span>
    </span>
  )

  if (!animated) return content

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {content}
    </motion.span>
  )
}

