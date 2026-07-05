import { authLoginUrl } from '../lib/api'

const features = [
  {
    title: 'Server control',
    text: 'Provision, power, and inspect Calagopus servers from a single dashboard.',
  },
  {
    title: 'Coin ledger',
    text: 'Track every reward, purchase, and top-up with a tamper-evident ledger.',
  },
  {
    title: 'Support and billing',
    text: 'Support tickets, SSLCommerz top-ups, and AFK rewards are built in.',
  },
]

export default function LandingPage() {
  function handleLogin() {
    window.location.assign(authLoginUrl())
  }

  return (
    <div className="landing-page">
      <section className="hero glass-card">
        <div className="hero-copy">
          <p className="eyebrow">Flux Client for Calagopus</p>
          <h1>Run your game infrastructure with a dashboard that feels like a control room.</h1>
          <p className="hero-text">
            Discord OAuth, coin balances, server provisioning, support tickets, AFK rewards, and payment
            validation all share one clean workspace.
          </p>
          <div className="hero-actions">
            <button className="button button-primary" type="button" onClick={handleLogin}>
              Sign in with Discord
            </button>
            <a className="button button-ghost" href="#feature-grid">
              Explore features
            </a>
          </div>
        </div>

        <div className="hero-aside">
          <div className="floating-stat">
            <span>Realtime</span>
            <strong>Redis locks</strong>
          </div>
          <div className="floating-stat accent">
            <span>Payments</span>
            <strong>SSLCommerz validated</strong>
          </div>
          <div className="floating-stat">
            <span>Console</span>
            <strong>WebSocket ready</strong>
          </div>
        </div>
      </section>

      <section id="feature-grid" className="feature-grid">
        {features.map((feature) => (
          <article className="glass-card feature-card" key={feature.title}>
            <p className="eyebrow">Feature</p>
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
