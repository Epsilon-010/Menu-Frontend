import { apiFetch } from '../../shared/api/http.ts'
import { collectPages, type Page } from '../../shared/api/pagination.ts'

export interface AdminAccount {
  id: string
  /** What the admin signs in with. */
  email: string
  full_name: string
  is_active: boolean
  /** Still on the temporary password the creating admin handed over. */
  must_change_password: boolean
}

export interface NewAdmin {
  /** Chosen by the client and kept until the create succeeds: a repeat never makes a second admin. */
  id?: string
  full_name: string
  email: string
}

/** Only the create answer carries the temporary password: it is shown once, never stored. */
export interface AdminWithTemporaryPassword extends AdminAccount {
  temporary_password: string
}

export type AdminChanges = Partial<Pick<AdminAccount, 'full_name' | 'is_active'>>

/** Error with a message ready to show to the admin. */
export class AdminsError extends Error {
  /** HTTP status of the failed request (0 when the server never answered). */
  readonly status: number

  constructor(message: string, status = 0) {
    super(message)
    this.status = status
  }

  /** A repeated create of an admin that exists: the password cannot be shown again, but nobody was duplicated. */
  get alreadyCreated(): boolean {
    return this.status === 409 && this.message.startsWith(ALREADY_CREATED)
  }
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const OFFLINE = 'Could not reach the server. Check your connection and try again.'
const SERVER_FAILED = 'The server could not complete that. Please try again in a moment.'
const ALREADY_CREATED = 'This admin was already created'

async function errorFrom(response: Response): Promise<AdminsError> {
  const body = (await response.json().catch(() => null)) as { detail?: unknown } | null
  if (typeof body?.detail === 'string') {
    return new AdminsError(body.detail.endsWith('.') ? body.detail : `${body.detail}.`, response.status)
  }
  if (response.status === 422) return new AdminsError('Please check the fields and try again.', 422)
  if (response.status === 401) return new AdminsError('Your session ended. Sign in again to keep editing.', 401)
  return new AdminsError(SERVER_FAILED, response.status)
}

async function send(path: string, init: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await apiFetch(path, init)
  } catch {
    throw new AdminsError(OFFLINE)
  }
  if (!response.ok) throw await errorFrom(response)
  return response
}

export async function listAdmins(): Promise<AdminAccount[]> {
  return collectPages(async (query) => (await (await send(`/admins${query}`, {})).json()) as Page<AdminAccount>)
}

/** The server generates the temporary password; the new admin must replace it on first sign-in. */
export async function createAdmin(admin: NewAdmin): Promise<AdminWithTemporaryPassword> {
  const response = await send('/admins', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(admin) })
  return (await response.json()) as AdminWithTemporaryPassword
}

/** Deactivating signs the admin out of every device right away. Nobody can deactivate themselves. */
export async function updateAdmin(id: string, changes: AdminChanges): Promise<AdminAccount> {
  const response = await send(`/admins/${id}`, { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(changes) })
  return (await response.json()) as AdminAccount
}
