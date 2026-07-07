import { motion } from 'framer-motion'
import clsx from 'clsx'
import styles from './Badge.module.css'
import { ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface BadgeProps {
  children: ReactNode
  variant?: Variant
  size?: Size
  className?: string
  animated?: boolean
}

/**
 * Badge Component
 * Displays labels, tags, and status indicators
 * Optional entrance animation
 */
export const Badge = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  animated = true,
}: BadgeProps) => {
  const content = (
    <span className={clsx(
      styles.badge,
      styles[`variant-${variant}`],
      styles[`size-${size}`],
      className
    )}>
      {children}
    </span>
  )

  if (!animated) return content

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      {content}
    </motion.span>
  )
}
