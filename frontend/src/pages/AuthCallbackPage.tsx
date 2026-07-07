import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { user, bootstrapping, error } = useAuth()

  useEffect(() => {
    // Wait for AuthContext to validate the OAuth cookie before navigating.
    // Once bootstrapping completes and user is set, the OAuth callback succeeded.
    if (!bootstrapping && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, bootstrapping, navigate])

  return (
    <div className="callback-screen glass-card">
      <p className="eyebrow">Discord OAuth</p>
      <h1>{error ? 'Callback failed' : 'Signing you in...'}</h1>
      <p>{error || 'Finishing your session and loading the dashboard.'}</p>
    </div>
  )
}
