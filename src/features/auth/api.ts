import { apiFetch, publicFetch, type Role, type SessionInfo } from '../../shared/api/http.ts'

export interface Account {
  user: { id: string; email: string; full_name: string; role: Role }
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

/** Signs in; the API sets the session cookies, the body only says which role signed in. */
export async function login(email: string, password: string): Promise<SessionInfo> {
  let response: Response
  try {
    response = await publicFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
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
