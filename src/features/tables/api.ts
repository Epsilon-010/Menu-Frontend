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
export class TableError extends Error {}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function errorFrom(response: Response): Promise<TableError> {
  if (response.status === 409) return new TableError('Another table already has that name.')
  if (response.status === 404) return new TableError('This table no longer exists.')
  if (response.status === 422) {
    const body = (await response.json().catch(() => null)) as { detail?: unknown } | null
    // Domain errors carry a readable message; schema errors carry a list of field problems.
    if (typeof body?.detail === 'string') return new TableError(`${body.detail}.`)
    return new TableError('Please check the fields and try again.')
  }
  return new TableError('Could not reach the server. Please try again.')
}

async function send(path: string, init: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await apiFetch(path, init)
  } catch {
    throw new TableError('Could not reach the server. Please try again.')
  }
  if (!response.ok) throw await errorFrom(response)
  return response
}

export async function listTables(): Promise<Table[]> {
  const response = await send('/tables', {})
  return (await response.json()) as Table[]
}

export async function createTable(name: string): Promise<TableWithPin> {
  const response = await send('/tables', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ name }) })
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
