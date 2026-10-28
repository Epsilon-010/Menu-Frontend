import { apiFetch } from '../../shared/api/http.ts'
import type { Order } from '../ordering/api.ts'

export type PaymentMethod = 'cash' | 'card' | 'other'

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
]

/** A table's visit, from opening the table until its payment. */
export interface Bill {
  id: string
  table_id: string
  table_name: string
  opened_at: string
  closed_at: string | null
  payment_method: PaymentMethod | null
  orders: Order[]
  /** Integer cents, computed by the server. */
  total_cents: number
}

export interface TableOverview {
  table_id: string
  table_name: string
  /** Null while the table is closed: its QR lets nobody in. */
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
const OFFLINE = 'Could not reach the server. Check your connection and try again.'
const SERVER_FAILED = 'The server could not complete that. Please try again in a moment.'

async function errorFrom(response: Response): Promise<BillError> {
  const body = (await response.json().catch(() => null)) as { detail?: unknown } | null
  if (typeof body?.detail === 'string' && response.status < 500) {
    return new BillError(body.detail.endsWith('.') ? body.detail : `${body.detail}.`, response.status)
  }
  if (response.status === 422) return new BillError('Please check the fields and try again.', 422)
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

/** Every table with its open bill, if any. */
export async function listTableBills(): Promise<TableOverview[]> {
  return (await (await send('/bills/tables')).json()) as TableOverview[]
}

/** Opens the table so its QR lets guests in. Idempotent: an open table answers with its bill. */
export async function openTable(tableId: string): Promise<Bill> {
  return (await (await send('/bills', json({ table_id: tableId }))).json()) as Bill
}

/** Registers the payment, which closes the bill and ends every guest session at the table. */
export async function registerPayment(billId: string, method: PaymentMethod): Promise<Bill> {
  return (await (await send(`/bills/${billId}/payment`, json({ method }))).json()) as Bill
}

/** Closes a table that has no orders (a bill with orders is closed by its payment). */
export async function closeTable(billId: string): Promise<void> {
  await send(`/bills/${billId}/close`, { method: 'POST' })
}

export interface NewOrderDish {
  /** Chosen by the client and kept until the add succeeds: a retry never adds the dish twice. */
  id: string
  item_id: string
  quantity: number
  note: string
}

/**
 * Adds a dish to an order of an open bill (a waiter swapping a rejected dish, for example).
 * The server prices it from the menu; a paid bill answers 409.
 */
export async function addOrderDish(orderId: string, dish: NewOrderDish): Promise<Order> {
  const body = { id: dish.id, item_id: dish.item_id, quantity: dish.quantity, note: dish.note.trim() }
  return (await (await send(`/orders/${orderId}/items`, json(body))).json()) as Order
}
