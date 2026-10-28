import { apiFetch } from '../../shared/api/http.ts'

export type StaffRole = 'waiter' | 'kitchen'

export interface StaffMember {
  id: string
  /** What the member signs in with, together with the PIN. */
  code: string
  full_name: string
  role: StaffRole
  is_active: boolean
}

export interface NewStaffMember {
  /** Chosen by the client and kept until the create succeeds: a repeat returns the same member. */
  id?: string
  full_name: string
  role: StaffRole
}

/** Only the create and new-PIN answers carry the PIN: it is shown once, never stored. */
export interface StaffMemberWithPin extends StaffMember {
  pin: string
}

export type StaffMemberChanges = Partial<Pick<StaffMember, 'full_name' | 'role' | 'is_active'>>

/** Error with a message ready to show to the admin. */
export class StaffError extends Error {
  /** HTTP status of the failed request (0 when the server never answered). */
  readonly status: number

  constructor(message: string, status = 0) {
    super(message)
    this.status = status
  }

  /** A repeated create of a member that exists: the PIN cannot be shown again, but nobody was duplicated. */
  get alreadyCreated(): boolean {
    return this.status === 409 && this.message.startsWith(ALREADY_CREATED)
  }
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const OFFLINE = 'Could not reach the server. Check your connection and try again.'
const SERVER_FAILED = 'The server could not complete that. Please try again in a moment.'
const ALREADY_CREATED = 'This staff member was already created'

async function errorFrom(response: Response): Promise<StaffError> {
  const body = (await response.json().catch(() => null)) as { detail?: unknown } | null
  // The server's own message tells conflicts apart (member already created, id already used).
  if (typeof body?.detail === 'string') {
    return new StaffError(body.detail.endsWith('.') ? body.detail : `${body.detail}.`, response.status)
  }
  if (response.status === 422) return new StaffError('Please check the fields and try again.', 422)
  if (response.status === 401) return new StaffError('Your session ended. Sign in again to keep editing.', 401)
  return new StaffError(SERVER_FAILED, response.status)
}

async function send(path: string, init: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await apiFetch(path, init)
  } catch {
    throw new StaffError(OFFLINE)
  }
  if (!response.ok) throw await errorFrom(response)
  return response
}

export async function listStaff(): Promise<StaffMember[]> {
  const response = await send('/staff', {})
  return (await response.json()) as StaffMember[]
}

/** The server generates the member's code and PIN. */
export async function createStaffMember(member: NewStaffMember): Promise<StaffMemberWithPin> {
  const response = await send('/staff', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(member) })
  return (await response.json()) as StaffMemberWithPin
}

/** Deactivating or changing the role signs the member out of every device right away. */
export async function updateStaffMember(id: string, changes: StaffMemberChanges): Promise<StaffMember> {
  const response = await send(`/staff/${id}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(changes),
  })
  return (await response.json()) as StaffMember
}

/** Generates a new PIN (the code stays) and signs the member out of every device. */
export async function regenerateStaffPin(id: string): Promise<StaffMemberWithPin> {
  const response = await send(`/staff/${id}/pin`, { method: 'POST' })
  return (await response.json()) as StaffMemberWithPin
}
