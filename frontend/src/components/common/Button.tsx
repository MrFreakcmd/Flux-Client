import { ReactNode } from 'react'
import type { ButtonProps } from '@types/index'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost'

interface ExtendedButtonProps extends ButtonProps {
  variant?: ButtonVariant
}

export default function Button({
  className = '',
  type = 'button',
  variant = 'primary',
  disabled = false,
  onClick,
  children,
}: ExtendedButtonProps) {
  const baseClasses = 'button'
  const variantClass = `button-${variant}`
  const classes = `${baseClasses} ${variantClass} ${className}`

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
