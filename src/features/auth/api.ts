import { apiFetch, publicFetch, type Role, type SessionInfo } from '../../shared/api/http.ts'

/**
 * Staff accounts carry `user`; table tablets carry `table`; guests who scanned the table's QR carry
 * `guest` and the `table` they joined. The others are null.
 */
export interface Account {
  /** Admins sign in with an email, waiters and cooks with a username. */
  user: { id: string; email: string | null; username: string | null; full_name: string; role: Role } | null
  table: { id: string; name: string } | null
  guest: { id: string; name: string } | null
  tenant: { id: string; name: string }
}

export function accountRole(account: Account): Role {
  if (account.user) return account.user.role
  return account.guest ? 'guest' : 'table'
}

export type LoginFailure = 'invalid-credentials' | 'too-many-attempts' | 'unavailable'

export class LoginError extends Error {
  readonly reason: LoginFailure

  constructor(reason: LoginFailure) {
    super(reason)
    this.reason = reason
  }
}

/** The API sets the session cookies; the body only says which role signed in. */
async function postLogin(path: string, body: Record<string, string>): Promise<SessionInfo> {
  let response: Response
  try {
    response = await publicFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new LoginError('unavailable')
  }
  if (response.status === 401 || response.status === 422) throw new LoginError('invalid-credentials')
  if (response.status === 429) throw new LoginError('too-many-attempts')
  if (!response.ok) throw new LoginError('unavailable')

  return (await response.json()) as SessionInfo
}

/** Signs in with the admin's email or a staff member's username. */
export function login(username: string, password: string): Promise<SessionInfo> {
  return postLogin('/auth/login', { username, password })
}

/** Signs a tablet in as its table with the table code and PIN the admin handed out. */
export function tableLogin(code: string, pin: string): Promise<SessionInfo> {
  return postLogin('/auth/table-login', { code, pin })
}

/** Longest guest name the API accepts (shown next to what the guest adds to the cart). */
export const GUEST_NAME_MAX_LENGTH = 30

const OFFLINE = 'Could not reach the server. Check your connection and try again.'

/** A failed QR join, with a message ready to show to the guest. */
export class QrJoinError extends Error {
  readonly status: number

  constructor(message: string, status = 0) {
    super(message)
    this.status = status
  }
}

function sentence(text: string): string {
  return text.endsWith('.') ? text : `${text}.`
}

/**
 * Joins the table's open visit as a guest with the token printed in its QR. The API sets the
 * session cookies; it answers 409 while no waiter has opened the table.
 */
export async function qrLogin(token: string, name?: string): Promise<SessionInfo> {
  const trimmed = name?.trim() ?? ''
  let response: Response
  try {
    response = await publicFetch('/auth/qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trimmed ? { token, name: trimmed } : { token }),
    })
  } catch {
    throw new QrJoinError(OFFLINE)
  }
  if (response.ok) return (await response.json()) as SessionInfo

  if (response.status === 429) throw new QrJoinError('Too many attempts. Wait a few minutes and try again.', 429)
  const body = (await response.json().catch(() => null)) as { detail?: unknown } | null
  if (typeof body?.detail === 'string' && response.status < 500) {
    throw new QrJoinError(sentence(body.detail), response.status)
  }
  throw new QrJoinError('The server could not complete that. Please try again in a moment.', response.status)
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
    guest: '/menu',
  }
  return paths[role]
}
