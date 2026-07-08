import { motion } from 'framer-motion'
import { Button, Card, PageTransition } from '../components'
import { useScrollReveal, staggerContainerVariants, staggerItemVariants } from '../hooks'
import { authLoginUrl } from '../lib/api'
import styles from './LandingPage.module.css'

interface Feature {
  title: string
  description: string
  icon: string
}

const features: Feature[] = [
  {
    title: 'Server Control',
    description: 'Provision, power, and inspect Calagopus servers from a single dashboard.',
    icon: '⚙️',
  },
  {
    title: 'Coin Ledger',
    description: 'Track every reward, purchase, and top-up with a tamper-evident ledger.',
    icon: '💰',
  },
  {
    title: 'Support & Billing',
    description: 'Support tickets, SSLCommerz top-ups, and AFK rewards are built in.',
    icon: '🎫',
  },
]

const stats = [
  { label: 'Realtime', value: 'Redis locks' },
  { label: 'Payments', value: 'SSLCommerz validated' },
  { label: 'Console', value: 'WebSocket ready' },
]

const heroVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

const floatingVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      delay: 0.3 + i * 0.15,
      duration: 0.4,
      type: 'spring',
      stiffness: 100,
    },
  }),
  hover: {
    y: -8,
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
}

export default function LandingPage() {
  const { ref: featuresRef, inView: featuresInView } = useScrollReveal()

  function handleLogin() {
    window.location.assign(authLoginUrl())
  }

  return (
    <PageTransition>
      <main style={{ width: '100%' }}>
        {/* Hero Section */}
        <section style={{ padding: 'var(--space-3xl) var(--space-lg)', backgroundColor: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
            <motion.div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-lg)',
              }}
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.1,
                  },
                },
              }}
            >
              <motion.p
                style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-accent)', margin: 0 }}
                variants={heroVariants}
              >
                Flux Client for Calagopus
              </motion.p>

              <motion.h1
                style={{ fontSize: 'var(--font-size-4xl)', fontWeight: '900', lineHeight: 1.2, margin: 0, color: 'var(--text-primary)', maxWidth: '800px' }}
                variants={heroVariants}
              >
                Run your game infrastructure with a dashboard that feels like a control room.
              </motion.h1>

              <motion.p
                style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6, maxWidth: '700px' }}
                variants={heroVariants}
              >
                Discord OAuth, coin balances, server provisioning, support tickets, AFK rewards, and payment validation all share one clean workspace.
              </motion.p>

            <motion.div className={styles.heroActions} variants={heroVariants}>
              <Button variant="primary" size="lg" onClick={handleLogin}>
                Sign in with Discord
              </Button>
              <Button variant="ghost" size="lg" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                Explore features
              </Button>
            </motion.div>
          </motion.div>

          {/* Floating Stats */}
          <motion.div
            className={styles.heroAside}
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className={styles.floatingStat}
                custom={i}
                variants={floatingVariants}
                whileHover="hover"
              >
                <span className={styles.statLabel}>{stat.label}</span>
                <strong className={styles.statValue}>{stat.value}</strong>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Features Section */}
        <section id="features" className={styles.featuresSection} ref={featuresRef}>
          <motion.div
            className={styles.sectionHeader}
            initial={{ opacity: 0, y: 20 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
          >
            <h2>Powerful Features</h2>
            <p>Everything you need to manage game infrastructure in one place</p>
          </motion.div>

          <motion.div
            className={styles.featureGrid}
            initial="hidden"
            animate={featuresInView ? 'visible' : 'hidden'}
            variants={staggerContainerVariants}
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={staggerItemVariants}>
                <Card hover className={styles.featureCard}>
                  <div className={styles.featureIcon}>{feature.icon}</div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* CTA Section */}
        <section className={styles.ctaSection}>
          <motion.div
            className={styles.ctaContent}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2>Ready to take control?</h2>
            <p>Join thousands of game server operators using Flux Client</p>
            <Button variant="primary" size="lg" onClick={handleLogin}>
              Get Started Now
            </Button>
          </motion.div>
        </section>
      </main>
    </PageTransition>
  )
}
