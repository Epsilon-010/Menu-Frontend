import { apiFetch, publicFetch, setAccessToken, type Role, type TokenResponse } from '../../shared/api/http.ts'

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

export async function login(email: string, password: string): Promise<TokenResponse> {
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

  const tokens = (await response.json()) as TokenResponse
  setAccessToken(tokens.access_token)
  return tokens
}

export async function fetchAccount(): Promise<Account | null> {
  const response = await apiFetch('/auth/me')
  if (!response.ok) return null
  return (await response.json()) as Account
}

export async function logout(): Promise<void> {
  try {
    await publicFetch('/auth/logout', { method: 'POST' })
  } finally {
    setAccessToken(null)
  }
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
