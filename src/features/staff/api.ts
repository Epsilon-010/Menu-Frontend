import { apiFetch } from '../../shared/api/http.ts'

export type StaffRole = 'waiter' | 'kitchen'

export interface StaffMember {
  id: string
  username: string
  full_name: string
  role: StaffRole
  is_active: boolean
}

export interface NewStaffMember {
  username: string
  full_name: string
  role: StaffRole
  password: string
}

export type StaffMemberChanges = Partial<Pick<StaffMember, 'full_name' | 'role' | 'is_active'>>

/** Error with a message ready to show to the admin. */
export class StaffError extends Error {}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function errorFrom(response: Response): Promise<StaffError> {
  if (response.status === 409) return new StaffError('That username is already taken.')
  if (response.status === 404) return new StaffError('This staff member no longer exists.')
  if (response.status === 422) {
    const body = (await response.json().catch(() => null)) as { detail?: unknown } | null
    // Domain errors carry a readable message; schema errors carry a list of field problems.
    if (typeof body?.detail === 'string') return new StaffError(`${body.detail}.`)
    return new StaffError('Please check the fields and try again.')
  }
  return new StaffError('Could not reach the server. Please try again.')
}

async function send(path: string, init: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await apiFetch(path, init)
  } catch {
    throw new StaffError('Could not reach the server. Please try again.')
  }
  if (!response.ok) throw await errorFrom(response)
  return response
}

export async function listStaff(): Promise<StaffMember[]> {
  const response = await send('/staff', {})
  return (await response.json()) as StaffMember[]
}

export async function createStaffMember(member: NewStaffMember): Promise<StaffMember> {
  const response = await send('/staff', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(member) })
  return (await response.json()) as StaffMember
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

/** Sets the password the admin chose and signs the member out of every device. */
export async function resetStaffPassword(id: string, password: string): Promise<void> {
  await send(`/staff/${id}/password`, { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify({ password }) })
}
