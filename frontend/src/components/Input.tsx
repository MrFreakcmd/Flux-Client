import { forwardRef, InputHTMLAttributes, ReactNode, useId } from 'react'
import clsx from 'clsx'
import styles from './Input.module.css'

type Variant = 'default' | 'ghost'
type IconPosition = 'start' | 'end'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  success?: boolean
  icon?: ReactNode
  iconPosition?: IconPosition
  variant?: Variant
  helpText?: string
}

/**
 * Input Component
 * Provides validation states, icons, labels, and accessible form support
 * Clear visual feedback for all input states (error, success, disabled)
 * Supports two variants and icon positioning for flexible form layouts
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      success = false,
      icon,
      iconPosition = 'end',
      variant = 'default',
      helpText,
      className,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const id = useId()
    const inputId = props.id || id
    const errorId = error ? `${inputId}-error` : undefined
    const helpId = helpText ? `${inputId}-help` : undefined

    return (
      <div className={clsx(styles.wrapper, className)}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
            {props.required && <span className={styles.required}>*</span>}
          </label>
        )}

        <div
          className={clsx(
            styles.inputWrapper,
            styles[`variant-${variant}`],
            icon && styles[`icon-${iconPosition}`],
            error && styles.hasError,
            success && styles.hasSuccess,
            disabled && styles.disabled
          )}
        >
          {icon && iconPosition === 'start' && (
            <span className={clsx(styles.icon, styles.iconStart)} aria-hidden="true">
              {icon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={styles.input}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={[errorId, helpId].filter(Boolean).join(' ') || undefined}
            {...props}
          />

          {icon && iconPosition === 'end' && (
            <span className={clsx(styles.icon, styles.iconEnd)} aria-hidden="true">
              {icon}
            </span>
          )}

          {success && !error && (
            <span className={clsx(styles.icon, styles.iconEnd, styles.successIcon)} aria-hidden="true">
              ✓
            </span>
          )}
        </div>

        {error && (
          <p id={errorId} className={styles.error} role="alert">
            {error}
          </p>
        )}

        {helpText && !error && (
          <p id={helpId} className={styles.helpText}>
            {helpText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

