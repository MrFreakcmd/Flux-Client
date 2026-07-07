import styles from './SkipLink.module.css'

/**
 * SkipLink Component
 * Accessibility feature: allows keyboard users to skip navigation
 * Visible on focus, hidden by default
 */
export const SkipLink = () => (
  <a href="#main-content" className={styles.skipLink}>
    Skip to main content
  </a>
)
