import { motion } from 'framer-motion'
import clsx from 'clsx'
import styles from './Card.module.css'
import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  glass?: boolean
  onClick?: () => void
}

/**
 * Animated Card Component
 * Provides elevation, hover effects, and glassmorphism options
 * Smooth spring animations on mount and hover
 */
export const Card = ({
  children,
  className,
  hover = true,
  glass = false,
  onClick
}: CardProps) => {
  return (
    <motion.div
      className={clsx(
        styles.card,
        glass && styles.glass,
        onClick && styles.interactive,
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover && !onClick ? { y: -4 } : onClick ? { scale: 1.02 } : {}}
      transition={{
        type: 'spring',
        stiffness: 100,
        damping: 15,
        duration: 0.3,
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick()
        }
      } : undefined}
    >
      {children}
    </motion.div>
  )
}
