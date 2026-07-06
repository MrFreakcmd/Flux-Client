import { ReactNode } from 'react'
import type { CardProps } from '@types/index'

export default function Card({ className = '', children }: CardProps) {
  const classes = `glass-card ${className}`

  return <div className={classes}>{children}</div>
}
