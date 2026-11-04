import { apiFetch } from '../../shared/api/http.ts'
import { withItemModifiers, type Order } from '../ordering/api.ts'

export type PaymentMethod = 'cash' | 'card' | 'other'

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'other', label: 'Otro' },
]

/** A table's visit, from opening the table until its payment. */
export interface Bill {
  id: string
  table_id: string
  table_name: string
  opened_at: string
  closed_at: string | null
  payment_method: PaymentMethod | null
  /** When the table asked for the bill and nobody attended it yet. */
  bill_requested_at: string | null
  orders: Order[]
  /** Integer cents, computed by the server. */
  total_cents: number
}

export interface TableOverview {
  table_id: string
  table_name: string
  /** Null while nobody is sitting there; the first QR scan (or the waiter) opens the next visit. */
  bill: Bill | null
}

/** Error with a message ready to show to the waiter. */
export class BillError extends Error {
  /** HTTP status of the failed request (0 when the server never answered). */
  readonly status: number

  constructor(message: string, status = 0) {
    super(message)
    this.status = status
  }
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const OFFLINE = 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
const SERVER_FAILED = 'El servidor no pudo completar la acción. Inténtalo de nuevo en un momento.'

async function errorFrom(response: Response): Promise<BillError> {
  const body = (await response.json().catch(() => null)) as { detail?: unknown } | null
  if (typeof body?.detail === 'string' && response.status < 500) {
    return new BillError(body.detail.endsWith('.') ? body.detail : `${body.detail}.`, response.status)
  }
  if (response.status === 422) return new BillError('Revisa los campos e inténtalo de nuevo.', 422)
  return new BillError(SERVER_FAILED, response.status)
}

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  let response: Response
  try {
    response = await apiFetch(path, init)
  } catch {
    throw new BillError(OFFLINE)
  }
  if (!response.ok) throw await errorFrom(response)
  return response
}

function json(body: unknown): RequestInit {
  return { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) }
}

/** A bill with every dish's options list filled in (an older server sends none). */
function billFrom(bill: Bill): Bill {
  return Array.isArray(bill.orders) ? { ...bill, orders: bill.orders.map(withItemModifiers) } : bill
}

/** Every table with its open bill, if any. */
export async function listTableBills(): Promise<TableOverview[]> {
  const tables = (await (await send('/bills/tables')).json()) as TableOverview[]
  return tables.map((table) => (table.bill ? { ...table, bill: billFrom(table.bill) } : table))
}

/** Opens the table by hand (the first QR scan also opens it). Idempotent: an open table answers with its bill. */
export async function openTable(tableId: string): Promise<Bill> {
  return billFrom((await (await send('/bills', json({ table_id: tableId }))).json()) as Bill)
}

/** Registers the payment, which closes the bill and ends every guest session at the table. */
export async function registerPayment(billId: string, method: PaymentMethod): Promise<Bill> {
  return billFrom((await (await send(`/bills/${billId}/payment`, json({ method }))).json()) as Bill)
}

/** Closes a table that has no orders (a bill with orders is closed by its payment). */
export async function closeTable(billId: string): Promise<void> {
  await send(`/bills/${billId}/close`, { method: 'POST' })
}

/** The waiter attends the table that asked for the bill. A bill already paid (404) counts as done. */
export async function dismissBillRequest(billId: string): Promise<void> {
  try {
    await send(`/bills/${billId}/request`, { method: 'DELETE' })
  } catch (error) {
    if (!(error instanceof BillError && error.status === 404)) throw error
  }
}

export interface NewOrderDish {
  /** Chosen by the client and kept until the add succeeds: a retry never adds the dish twice. */
  id: string
  item_id: string
  quantity: number
  note: string
  /** Ids of the chosen options; left out of the request when there are none. */
  modifier_option_ids?: string[]
}

/**
 * Adds a dish to an order of an open bill (a waiter swapping a rejected dish, for example).
 * The server prices it from the menu; a paid bill answers 409.
 */
export async function addOrderDish(orderId: string, dish: NewOrderDish): Promise<Order> {
  const body = { id: dish.id, item_id: dish.item_id, quantity: dish.quantity, note: dish.note.trim() }
  const options = dish.modifier_option_ids ?? []
  const request = options.length > 0 ? { ...body, modifier_option_ids: options } : body
  return withItemModifiers((await (await send(`/orders/${orderId}/items`, json(request))).json()) as Order)
}
