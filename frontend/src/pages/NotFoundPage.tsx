import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button, PageTransition } from '../components'
import styles from './NotFoundPage.module.css'

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
}

const numberVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
}

export default function NotFoundPage() {
  return (
    <PageTransition>
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 'var(--space-lg)' }}>
        <motion.div
          style={{ textAlign: 'center', maxWidth: '600px' }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            style={{ fontSize: '120px', fontWeight: '900', color: 'var(--color-primary)', marginBottom: 'var(--space-lg)', lineHeight: 1 }}
            variants={numberVariants}
          >
            404
          </motion.div>

          <motion.h1
            style={{ margin: '0 0 var(--space-md) 0', fontSize: 'var(--font-size-3xl)', fontWeight: '700' }}
            variants={itemVariants}
          >
            The page drifted off course.
          </motion.h1>

          <motion.p
            style={{ margin: '0 0 var(--space-lg) 0', color: 'var(--text-secondary)', fontSize: 'var(--font-size-md)', lineHeight: 1.6 }}
            variants={itemVariants}
          >
            The route you requested does not exist in Flux Client. Let's get you back on track.
          </motion.p>

          <motion.div
            style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}
            variants={itemVariants}
          >
            <Link to="/dashboard">
              <Button variant="primary" size="lg">
                Return to Dashboard
              </Button>
            </Link>
            <Link to="/">
              <Button variant="ghost" size="lg">
                Go Home
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </main>
    </PageTransition>
  )
}
