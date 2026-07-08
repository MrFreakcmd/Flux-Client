import { ReactNode } from 'react'
import clsx from 'clsx'
import styles from './PageHeader.module.css'

interface Breadcrumb {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: Breadcrumb[]
  actions?: ReactNode
  className?: string
}

/**
 * Page Header Component
 * Reusable header for all pages with breadcrumbs, title, subtitle, and action buttons
 * Provides consistent visual hierarchy and navigation context
 */
export const PageHeader = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) => {
  return (
    <div className={clsx(styles.header, className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <ol className={styles.breadcrumbList}>
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className={styles.breadcrumbItem}>
                {crumb.href ? (
                  <a href={crumb.href} className={styles.breadcrumbLink}>
                    {crumb.label}
                  </a>
                ) : (
                  <span className={styles.breadcrumbCurrent}>{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && (
                  <span className={styles.separator} aria-hidden="true">
                    /
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className={styles.headerContent}>
        <div className={styles.meta}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>

        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  )
}
