// Default to same-origin API requests; deployments can override this at build time.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
export const TOKEN_KEY = 'flux_token'

export function apiDisplayHost(): string {
  if (!API_BASE_URL) {
    return window.location.host
  }

  try {
    return new URL(API_BASE_URL).host
  } catch {
    return API_BASE_URL.replace(/^https?:\/\//, '')
  }
}

export function buildApiUrl(path: string): string {
  if (!path.startsWith('/')) {
    return `${API_BASE_URL}/${path}`
  }
  return `${API_BASE_URL}${path}`
}

export function authLoginUrl(ref?: string): string {
  const suffix = ref ? `?ref=${encodeURIComponent(ref)}` : ''
  return buildApiUrl(`/api/auth/login${suffix}`)
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

interface ApiFetchOptions extends RequestInit {
  body?: any
}

export async function apiFetch<T = any>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || {})
  headers.set('Accept', headers.get('Accept') || 'application/json')

  const token = getStoredToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let body: any = options.body
  if (body && !(body instanceof FormData) && !(body instanceof URLSearchParams) && typeof body !== 'string') {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(body)
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers,
    body,
    credentials: 'include', // Send HttpOnly cookies (set by OAuth callback) with requests
  })

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    const detail = data?.detail || data?.message || data?.error || response.statusText
    const message = Array.isArray(detail)
      ? detail.map((entry: any) => entry.msg || entry.message || String(entry)).join(', ')
      : detail
    throw new Error(message)
  }

  return data as T
}
