/**
 * Central HTTP client.
 *
 * - Both tokens live in httpOnly cookies set by the API: the access token (path /api) and the
 *   refresh token (path /api/v1/auth). JavaScript never reads or stores either of them; the
 *   browser attaches them to same-origin requests.
 * - On a 401 the client refreshes once and retries. Concurrent 401s share a single refresh
 *   request: sending the same refresh token twice would look like token theft to the backend
 *   and revoke the whole session.
 */

export type Role = 'admin' | 'waiter' | 'kitchen' | 'table' | 'guest'

export interface SessionInfo {
  expires_in: number
  role: Role
}

const API_BASE = '/api/v1'

let refreshInFlight: Promise<SessionInfo | null> | null = null
const sessionEndedListeners = new Set<() => void>()

/** Called when the session can no longer be refreshed (expired, revoked or logged out elsewhere). */
export function onSessionEnded(listener: () => void): () => void {
  sessionEndedListeners.add(listener)
  return () => sessionEndedListeners.delete(listener)
}

export function refreshSession(): Promise<SessionInfo | null> {
  refreshInFlight ??= requestRefresh().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

async function requestRefresh(): Promise<SessionInfo | null> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST' })
    if (!response.ok) return null
    return (await response.json()) as SessionInfo
  } catch {
    return null
  }
}

/** A request with no answer by then fails, so a hung connection never blocks the queue of changes. */
export const REQUEST_TIMEOUT_MS = 15_000

/** Aborts when either signal does (AbortSignal.any where the browser has it, older tablets otherwise). */
function eitherSignal(first: AbortSignal, second: AbortSignal): AbortSignal {
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([first, second])
  const controller = new AbortController()
  for (const signal of [first, second]) {
    if (signal.aborted) controller.abort(signal.reason)
    else signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  }
  return controller.signal
}

function withDeadline(init: RequestInit): RequestInit {
  const deadline = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  return { ...init, signal: init.signal ? eitherSignal(init.signal, deadline) : deadline }
}

/** Authenticated request: relies on the access cookie and transparently refreshes it once on 401. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${API_BASE}${path}`, withDeadline(init))
  if (response.status !== 401) return response

  const refreshed = await refreshSession()
  if (!refreshed) {
    sessionEndedListeners.forEach((listener) => listener())
    return response
  }
  return fetch(`${API_BASE}${path}`, withDeadline(init))
}

/** Request that must not trigger a refresh (login, logout). */
export function publicFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, init)
}
