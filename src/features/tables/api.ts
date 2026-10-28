import { apiFetch } from '../../shared/api/http.ts'

export interface Table {
  id: string
  name: string
  /** Fixed device login code, unique across the platform. */
  code: string
  is_active: boolean
}

/** Returned only when a table is created or its PIN regenerated: the PIN is never shown again. */
export interface TableWithPin extends Table {
  pin: string
}

export type TableChanges = Partial<Pick<Table, 'name' | 'is_active'>>

/** Error with a message ready to show to the admin. */
export class TableError extends Error {
  /** HTTP status of the failed request (0 when the server never answered). */
  readonly status: number

  constructor(message: string, status = 0) {
    super(message)
    this.status = status
  }

  /** A repeated create of a table that exists: its PIN cannot be shown again, but nothing was duplicated. */
  get alreadyCreated(): boolean {
    return this.status === 409 && this.message.startsWith(ALREADY_CREATED)
  }
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const OFFLINE = 'Could not reach the server. Check your connection and try again.'
const SERVER_FAILED = 'The server could not complete that. Please try again in a moment.'
const ALREADY_CREATED = 'This table was already created'

async function errorFrom(response: Response): Promise<TableError> {
  const body = (await response.json().catch(() => null)) as { detail?: unknown } | null
  // The server's own message tells conflicts apart (name in use, table already created, id taken).
  if (typeof body?.detail === 'string') {
    return new TableError(body.detail.endsWith('.') ? body.detail : `${body.detail}.`, response.status)
  }
  if (response.status === 422) return new TableError('Please check the fields and try again.', 422)
  if (response.status === 401) return new TableError('Your session ended. Sign in again to keep editing.', 401)
  return new TableError(SERVER_FAILED, response.status)
}

async function send(path: string, init: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await apiFetch(path, init)
  } catch {
    throw new TableError(OFFLINE)
  }
  if (!response.ok) throw await errorFrom(response)
  return response
}
export async function listTables(): Promise<Table[]> {
  const response = await send('/tables', {})
  return (await response.json()) as Table[]
}

/** `id` is chosen by the client and kept until the create succeeds: a repeat never makes a second table. */
export async function createTable(name: string, id?: string): Promise<TableWithPin> {
  const response = await send('/tables', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ id, name }) })
  return (await response.json()) as TableWithPin
}

/** Deactivating a table signs its tablet out right away. */
export async function updateTable(id: string, changes: TableChanges): Promise<Table> {
  const response = await send(`/tables/${id}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(changes),
  })
  return (await response.json()) as Table
}

/** Issues a new PIN (the code stays) and signs the table's tablet out. */
export async function regenerateTablePin(id: string): Promise<TableWithPin> {
  const response = await send(`/tables/${id}/pin`, { method: 'POST' })
  return (await response.json()) as TableWithPin
}
