/**
 * Central HTTP client.
 *
 * - The access token lives only in memory (never in localStorage or cookies).
 * - The refresh token is an httpOnly cookie scoped to /api/v1/auth; the browser sends it.
 * - On a 401 the client refreshes once and retries. Concurrent 401s share a single refresh
 *   request: sending the same refresh token twice would look like token theft to the backend
 *   and revoke the whole session.
 */

export type Role = 'admin' | 'waiter' | 'kitchen' | 'table'

export interface TokenResponse {
  access_token: string
  token_type: 'bearer'
  expires_in: number
  role: Role
}

const API_BASE = '/api/v1'

let accessToken: string | null = null
let refreshInFlight: Promise<TokenResponse | null> | null = null
const sessionEndedListeners = new Set<() => void>()

export function setAccessToken(token: string | null): void {
  accessToken = token
}

/** Called when the session can no longer be refreshed (expired, revoked or logged out elsewhere). */
export function onSessionEnded(listener: () => void): () => void {
  sessionEndedListeners.add(listener)
  return () => sessionEndedListeners.delete(listener)
}

export function refreshSession(): Promise<TokenResponse | null> {
  refreshInFlight ??= requestRefresh().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

async function requestRefresh(): Promise<TokenResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST' })
    if (!response.ok) {
      setAccessToken(null)
      return null
    }
    const tokens = (await response.json()) as TokenResponse
    setAccessToken(tokens.access_token)
    return tokens
  } catch {
    // Network failure: keep the current token, the next request can try again.
    return null
  }
}

function send(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers)
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  return fetch(`${API_BASE}${path}`, { ...init, headers })
}

/** Authenticated request: adds the access token and transparently refreshes it once on 401. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await send(path, init)
  if (response.status !== 401) return response

  const refreshed = await refreshSession()
  if (!refreshed) {
    sessionEndedListeners.forEach((listener) => listener())
    return response
  }
  return send(path, init)
}

/** Unauthenticated request to the API (login, logout). */
export function publicFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, init)
}
