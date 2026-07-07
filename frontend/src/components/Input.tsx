import { forwardRef, ReactNode } from 'react'
import clsx from 'clsx'
import styles from './Input.module.css'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helpText?: string
  icon?: ReactNode
  isRequired?: boolean
}

/**
 * Input Component
 * Accessible form input with label, error, and help text support
 * Proper ARIA attributes for screen readers
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helpText,
      icon,
      isRequired = false,
      id,
      className,
      type = 'text',
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
    const errorId = error ? `${inputId}-error` : undefined
    const helpId = helpText ? `${inputId}-help` : undefined

    return (
      <div className={styles.container}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
            {isRequired && <span className={styles.required} aria-label="required">*</span>}
          </label>
        )}

        <div className={clsx(styles.inputWrapper, error && styles.hasError)}>
          {icon && <span className={styles.icon}>{icon}</span>}
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={clsx(styles.input, className)}
            aria-invalid={!!error}
            aria-describedby={[errorId, helpId].filter(Boolean).join(' ') || undefined}
            required={isRequired}
            {...props}
          />
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
