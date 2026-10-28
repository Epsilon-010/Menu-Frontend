import { publicFetch, type SessionInfo } from '../../shared/api/http.ts'

/** Limits the API applies to a sign-up (Backend auth register schema). */
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128
export const BUSINESS_NAME_MAX_LENGTH = 120

export interface SignUp {
  /** Chosen by the client and kept until the sign-up succeeds: a repeat signs in to the account already made. */
  id?: string
  email: string
  password: string
  business_name: string
}

/** Where a sign-up error belongs: the email of step 1, or the form as a whole. */
export type SignUpField = 'email' | 'form'

/** A failed sign-up, with a message ready to show next to the field it belongs to. */
export class RegisterError extends Error {
  readonly field: SignUpField
  readonly status: number

  constructor(message: string, field: SignUpField = 'form', status = 0) {
    super(message)
    this.field = field
    this.status = status
  }

  /** The client id clashed with something else: the next attempt must use a new id. */
  get newIdNeeded(): boolean {
    return this.status === 409 && this.field === 'form'
  }
}

const OFFLINE = 'Could not reach the server. Check your connection and try again.'
const SERVER_FAILED = 'The server could not complete that. Please try again in a moment.'
const EMAIL_TAKEN = 'Email already in use'

function sentence(text: string): string {
  return text.endsWith('.') ? text : `${text}.`
}

async function errorFrom(response: Response): Promise<RegisterError> {
  if (response.status === 429) return new RegisterError('Too many attempts. Wait a few minutes and try again.', 'form', 429)
  const body = (await response.json().catch(() => null)) as { detail?: unknown } | null
  const detail = typeof body?.detail === 'string' ? body.detail : null
  if (response.status === 409 && detail?.startsWith(EMAIL_TAKEN)) {
    return new RegisterError('That email already has an account. Sign in, or use another email.', 'email', 409)
  }
  if (response.status === 409) {
    return new RegisterError(`${sentence(detail ?? 'That sign-up clashed with another one')} Try again.`, 'form', 409)
  }
  if (detail !== null && response.status < 500) return new RegisterError(sentence(detail), 'form', response.status)
  return new RegisterError(SERVER_FAILED, 'form', response.status)
}

/** Creates the business and its admin in one step; the API sets the session cookies like a sign in. */
export async function register(signUp: SignUp): Promise<SessionInfo> {
  let response: Response
  try {
    response = await publicFetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signUp),
    })
  } catch {
    throw new RegisterError(OFFLINE)
  }
  if (!response.ok) throw await errorFrom(response)
  return (await response.json()) as SessionInfo
}

/** Step 1 check: an error for the email or the password, or null when both are fine. */
export function credentialsError(
  email: string,
  password: string,
): { field: 'email' | 'password'; message: string } | null {
  const trimmed = email.trim()
  if (trimmed === '') return { field: 'email', message: 'Enter your email.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return { field: 'email', message: 'Enter a valid email.' }
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return { field: 'password', message: `Use ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters.` }
  }
  return null
}

/** Step 2 check: an error for the business name, or null when it is fine. */
export function businessNameError(name: string): string | null {
  const trimmed = name.trim()
  if (trimmed === '') return 'Enter the name of your business.'
  if (trimmed.length > BUSINESS_NAME_MAX_LENGTH) return `Use at most ${BUSINESS_NAME_MAX_LENGTH} characters.`
  return null
}

/**
 * The server replays a sign-up only with the same id, email, password and business name, so the
 * client id follows those three: editing any of them is a new sign-up with a new id.
 */
export function signUpDraftKey(email: string, password: string, businessName: string): string {
  return JSON.stringify([email.trim().toLowerCase(), password, businessName.trim()])
}
