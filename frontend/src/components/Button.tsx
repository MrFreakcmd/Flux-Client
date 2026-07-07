import { forwardRef, ReactNode, ButtonHTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'warning'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
  icon?: ReactNode
  children: ReactNode
}

/**
 * Animated Button Component
 * Provides micro-interactions with smooth spring animations
 * Fully accessible with keyboard navigation and ARIA support
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      icon,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading

    return (
      <motion.button
        ref={ref}
        className={clsx(
          styles.button,
          styles[`variant-${variant}`],
          styles[`size-${size}`],
          className
        )}
        whileHover={!isDisabled ? { scale: 1.05, y: -2 } : {}}
        whileTap={!isDisabled ? { scale: 0.95 } : {}}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 17,
        }}
        disabled={isDisabled}
        aria-busy={isLoading}
        aria-disabled={isDisabled}
        {...(props as any)}
      >
        {isLoading ? (
          <span className={styles.loader} aria-label="Loading" />
        ) : (
          <>
            {icon && <span className={styles.icon}>{icon}</span>}
            <span>{children}</span>
          </>
        )}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'
