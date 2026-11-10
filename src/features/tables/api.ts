import { apiFetch } from '../../shared/api/http.ts'
import { collectPages, type Page } from '../../shared/api/pagination.ts'

export interface Table {
  id: string
  name: string
  /** Fixed device login code, unique across the platform. */
  code: string
  is_active: boolean
  /** Token printed in the table's QR (the link `/q/<token>`); null if the table has none yet. */
  qr_token: string | null
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
const OFFLINE = 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.'
const SERVER_FAILED = 'El servidor no pudo completar la acción. Intenta de nuevo en un momento.'
const ALREADY_CREATED = 'This table was already created'

async function errorFrom(response: Response): Promise<TableError> {
  const body = (await response.json().catch(() => null)) as { detail?: unknown } | null
  // The server's own message tells conflicts apart (name in use, table already created, id taken).
  if (typeof body?.detail === 'string') {
    return new TableError(body.detail.endsWith('.') ? body.detail : `${body.detail}.`, response.status)
  }
  if (response.status === 422) return new TableError('Revisa los campos e intenta de nuevo.', 422)
  if (response.status === 401) return new TableError('Tu sesión terminó. Inicia sesión de nuevo para seguir editando.', 401)
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
  return collectPages(async (query) => (await (await send(`/tables${query}`, {})).json()) as Page<Table>)
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

/** The link printed as the table's QR code. */
export function qrLink(token: string, origin: string = window.location.origin): string {
  return `${origin}/q/${token}`
}

/** Issues a new QR token: the old QR stops working and guests who joined with it are signed out. */
export async function regenerateTableQr(id: string): Promise<Table> {
  const response = await send(`/tables/${id}/qr`, { method: 'POST' })
  return (await response.json()) as Table
}

/** Issues a new PIN (the code stays) and signs the table's tablet out. */
export async function regenerateTablePin(id: string): Promise<TableWithPin> {
  const response = await send(`/tables/${id}/pin`, { method: 'POST' })
  return (await response.json()) as TableWithPin
}
