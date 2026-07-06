import type { BadgeProps } from '@types/index'

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info'

interface ExtendedBadgeProps extends BadgeProps {
  variant?: BadgeVariant
}

export default function Badge({ className = '', variant = 'info', children }: ExtendedBadgeProps) {
  const classes = `badge badge-${variant} ${className}`

  return <span className={classes}>{children}</span>
}
