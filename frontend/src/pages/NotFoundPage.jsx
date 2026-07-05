import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="callback-screen glass-card">
      <p className="eyebrow">404</p>
      <h1>The page drifted off course.</h1>
      <p>The route you requested does not exist in Flux Client.</p>
      <Link className="button button-primary" to="/dashboard">
        Return to dashboard
      </Link>
    </div>
  )
}
