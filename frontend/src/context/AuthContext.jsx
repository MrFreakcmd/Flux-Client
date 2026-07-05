import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { apiFetch, clearStoredToken, getStoredToken, setStoredToken } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getStoredToken())
  const [user, setUser] = useState(null)
  const [bootstrapping, setBootstrapping] = useState(Boolean(getStoredToken()))
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    async function loadUser() {
      if (!token) {
        setUser(null)
        setBootstrapping(false)
        return
      }

      setBootstrapping(true)
      try {
        const me = await apiFetch('/api/auth/me')
        if (active) {
          setUser(me)
          setError(null)
        }
      } catch (err) {
        clearStoredToken()
        if (active) {
          setTokenState(null)
          setUser(null)
          setError(err.message)
        }
      } finally {
        if (active) {
          setBootstrapping(false)
        }
      }
    }

    loadUser()

    return () => {
      active = false
    }
  }, [token])

  const loginWithToken = useCallback((nextToken) => {
    setStoredToken(nextToken)
    setTokenState(nextToken)
  }, [])

  const logout = useCallback(() => {
    clearStoredToken()
    setTokenState(null)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    if (!token) {
      return null
    }

    const me = await apiFetch('/api/auth/me')
    setUser(me)
    return me
  }, [token])

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        bootstrapping,
        error,
        loginWithToken,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
