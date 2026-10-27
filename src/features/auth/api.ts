import { apiFetch, publicFetch, type Role, type SessionInfo } from '../../shared/api/http.ts'

export interface Account {
  /** Admins sign in with an email, waiters and cooks with a username. */
  user: { id: string; email: string | null; username: string | null; full_name: string; role: Role }
  tenant: { id: string; name: string }
}

export type LoginFailure = 'invalid-credentials' | 'too-many-attempts' | 'unavailable'

export class LoginError extends Error {
  readonly reason: LoginFailure

  constructor(reason: LoginFailure) {
    super(reason)
    this.reason = reason
  }
}

/**
 * Signs in with the admin's email or a staff member's username. The API sets the session
 * cookies; the body only says which role signed in.
 */
export async function login(username: string, password: string): Promise<SessionInfo> {
  let response: Response
  try {
    response = await publicFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  } catch {
    throw new LoginError('unavailable')
  }
  if (response.status === 401 || response.status === 422) throw new LoginError('invalid-credentials')
  if (response.status === 429) throw new LoginError('too-many-attempts')
  if (!response.ok) throw new LoginError('unavailable')

  return (await response.json()) as SessionInfo
}

export async function fetchAccount(): Promise<Account | null> {
  const response = await apiFetch('/auth/me')
  if (!response.ok) return null
  return (await response.json()) as Account
}

/** Revokes the session; the API clears both cookies. */
export async function logout(): Promise<void> {
  await publicFetch('/auth/logout', { method: 'POST' })
}

export function homePathFor(role: Role): string {
  const paths: Record<Role, string> = {
    admin: '/admin',
    waiter: '/waiter',
    kitchen: '/kitchen',
    table: '/menu',
  }
  return paths[role]
}
