import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const { loginWithToken } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setError('Missing dashboard token in the callback URL.')
      return
    }

    loginWithToken(token)
    navigate('/dashboard', { replace: true })
  }, [loginWithToken, navigate, searchParams])

  return (
    <div className="callback-screen glass-card">
      <p className="eyebrow">Discord OAuth</p>
      <h1>{error ? 'Callback failed' : 'Signing you in...'}</h1>
      <p>{error || 'Finishing your session and loading the dashboard.'}</p>
    </div>
  )
}
