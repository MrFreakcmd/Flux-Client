import { motion } from 'framer-motion'
import clsx from 'clsx'
import styles from './Card.module.css'
import { ReactNode } from 'react'

type Variant = 'default' | 'elevated' | 'glass' | 'outline'

interface CardProps {
  children: ReactNode
  variant?: Variant
  header?: ReactNode
  footer?: ReactNode
  hover?: boolean
  interactive?: boolean
  onClick?: () => void
  className?: string
}

/**
 * Animated Card Component
 * Provides elevation, hover effects, glassmorphism options, and composite structure
 * Smooth spring animations on mount and interactive states
 * Supports header, body, and footer sections with visual separation
 */
export const Card = ({
  children,
  variant = 'default',
  header,
  footer,
  hover = true,
  interactive = false,
  onClick,
  className
}: CardProps) => {
  const isClickable = !!onClick || interactive

  return (
    <motion.div
      className={clsx(
        styles.card,
        styles[`variant-${variant}`],
        isClickable && styles.clickable,
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover && !isClickable ? { y: -4 } : isClickable ? { scale: 1.01 } : {}}
      whileTap={isClickable ? { scale: 0.99 } : {}}
      transition={{
        type: 'spring',
        stiffness: 100,
        damping: 15,
        duration: 0.3,
      }}
      onClick={onClick}
      role={isClickable ? 'button' : 'region'}
      tabIndex={isClickable ? 0 : -1}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      } : undefined}
    >
      {header && (
        <div className={styles.header}>
          {header}
        </div>
      )}

      <div className={styles.body}>
        {children}
      </div>

      {footer && (
        <div className={styles.footer}>
          {footer}
        </div>
      )}
    </motion.div>
  )
}
