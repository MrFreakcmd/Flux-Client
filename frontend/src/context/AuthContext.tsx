import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
import { apiFetch, clearStoredToken, getStoredToken, setStoredToken } from '../lib/api'
import type { User } from '@types/index'

interface AuthContextValue {
  token: string | null
  user: User | null
  bootstrapping: boolean
  error: string | null
  loginWithToken: (token: string) => void
  logout: () => void
  refreshUser: () => Promise<User | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getStoredToken())
  const [user, setUser] = useState<User | null>(null)
  const [bootstrapping, setBootstrapping] = useState<boolean>(Boolean(getStoredToken()))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadUser() {
      setBootstrapping(true)
      try {
        // Attempt to fetch /api/auth/me. The backend checks for:
        // 1. HttpOnly cookie (set by OAuth callback, sent automatically)
        // 2. Authorization header with Bearer token
        // This works even if localStorage token is empty.
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
          // Always show auth errors for debugging OAuth callback failures
          setError(err instanceof Error ? err.message : 'Authentication failed')
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

  const loginWithToken = useCallback((nextToken: string) => {
    setStoredToken(nextToken)
    setTokenState(nextToken)
  }, [])

  const logout = useCallback(() => {
    clearStoredToken()
    setTokenState(null)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async (): Promise<User | null> => {
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

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
