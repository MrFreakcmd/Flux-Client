import { forwardRef, ReactNode, ButtonHTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost' | 'outline'
type Size = 'sm' | 'md' | 'lg'
type IconPosition = 'start' | 'end'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
  icon?: ReactNode
  iconPosition?: IconPosition
  fullWidth?: boolean
  children: ReactNode
}

/**
 * Animated Button Component
 * Provides micro-interactions with smooth spring animations
 * Fully accessible with keyboard navigation and ARIA support
 * Supports 7 variants, 3 sizes, icon positioning, and full width layouts
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      icon,
      iconPosition = 'start',
      fullWidth = false,
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
          fullWidth && styles.fullWidth,
          className
        )}
        whileHover={!isDisabled ? { scale: 1.02, y: -1 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        transition={{
          type: 'spring',
          stiffness: 350,
          damping: 25,
          duration: 0.2,
        }}
        disabled={isDisabled}
        aria-busy={isLoading}
        aria-disabled={isDisabled}
        {...(props as any)}
      >
        {isLoading ? (
          <span className={styles.loader} aria-label="Loading" />
        ) : (
          <span className={styles.content}>
            {icon && iconPosition === 'start' && (
              <span className={styles.icon} aria-hidden="true">
                {icon}
              </span>
            )}
            <span className={styles.label}>{children}</span>
            {icon && iconPosition === 'end' && (
              <span className={styles.icon} aria-hidden="true">
                {icon}
              </span>
            )}
          </span>
        )}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'
