import { apiFetch } from '../../shared/api/http.ts'

/** What the table sees of the menu: visible categories with their available items. */
export interface MenuItem {
  id: string
  name: string
  description: string
  /** Integer cents. */
  price_cents: number
  /** URLs are null while the image storage is not configured on the server. */
  image: { thumbnail_url: string | null; card_url: string | null } | null
}

export interface MenuCategory {
  id: string
  name: string
  items: MenuItem[]
}

export interface CartLine {
  id: string
  item_id: string
  name: string
  quantity: number
  note: string
  /** Guest name, "Guest N" or "Tablet". */
  added_by: string
  /** An item taken off the menu after it was added: kept in the cart, left out of the total. */
  available: boolean
  unit_price_cents: number | null
  subtotal_cents: number
}

/** The cart every device at the table shares; `version` grows with each change. */
export interface Cart {
  version: number
  lines: CartLine[]
  total_cents: number
}

export type OrderItemStatus = 'queued' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
export type OrderStatus = 'queued' | 'in_progress' | 'partially_delivered' | 'completed' | 'cancelled'

export interface OrderItem {
  id: string
  item_id: string
  name: string
  quantity: number
  note: string
  added_by: string
  status: OrderItemStatus
  /** Why the kitchen or a waiter rejected the dish; null unless it is cancelled. */
  cancel_reason: string | null
  unit_price_cents: number
  subtotal_cents: number
}

export interface Order {
  id: string
  number: number
  status: OrderStatus
  sent_by: string
  created_at: string
  items: OrderItem[]
  total_cents: number
}

export interface NewCartLine {
  /** Chosen by the client and kept until the add succeeds: a repeat never adds the line twice. */
  id?: string
  item_id: string
  quantity: number
  note: string
}

export type CartLineChanges = Partial<Pick<CartLine, 'quantity' | 'note'>>

export const MIN_QUANTITY = 1
export const MAX_QUANTITY = 50
export const MAX_NOTE_LENGTH = 200

/** The server's message when the cart changed after the sender reviewed it. */
export const CART_CHANGED = 'The order changed, review it'

/** Error with a message ready to show at the table. */
export class OrderingError extends Error {
  /** HTTP status of the failed request (0 when the server never answered). */
  readonly status: number
  /** Menu items that are no longer available, when the server names them. */
  readonly unavailableItemIds: string[]
  /** The server's own message, without the closing period added for display. */
  readonly detail: string | null

  constructor(message: string, status = 0, detail: string | null = null, unavailableItemIds: string[] = []) {
    super(message)
    this.status = status
    this.detail = detail
    this.unavailableItemIds = unavailableItemIds
  }

  /** Someone changed the cart after it was reviewed: the sender must review it again. */
  get cartChanged(): boolean {
    return this.status === 409 && this.detail === CART_CHANGED
  }
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const OFFLINE = 'Could not reach the server. Check your connection and try again.'
const SERVER_FAILED = 'The server could not complete that. Please try again in a moment.'

async function errorFrom(response: Response): Promise<OrderingError> {
  const body = (await response.json().catch(() => null)) as {
    detail?: unknown
    unavailable_item_ids?: unknown
  } | null
  const ids = Array.isArray(body?.unavailable_item_ids)
    ? body.unavailable_item_ids.filter((id): id is string => typeof id === 'string')
    : []
  if (typeof body?.detail === 'string' && response.status < 500) {
    const detail = body.detail
    return new OrderingError(detail.endsWith('.') ? detail : `${detail}.`, response.status, detail, ids)
  }
  if (response.status === 422) return new OrderingError('Please check the fields and try again.', 422)
  return new OrderingError(SERVER_FAILED, response.status)
}

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  let response: Response
  try {
    response = await apiFetch(path, init)
  } catch {
    throw new OrderingError(OFFLINE)
  }
  if (!response.ok) throw await errorFrom(response)
  return response
}

function json(method: string, body: unknown): RequestInit {
  return { method, headers: JSON_HEADERS, body: JSON.stringify(body) }
}

export async function fetchMenu(): Promise<MenuCategory[]> {
  return (await (await send('/menu')).json()) as MenuCategory[]
}

export async function fetchCart(): Promise<Cart> {
  return (await (await send('/table/cart')).json()) as Cart
}

export async function addCartLine(line: NewCartLine): Promise<Cart> {
  return (await (await send('/table/cart/lines', json('POST', line))).json()) as Cart
}

export async function updateCartLine(id: string, changes: CartLineChanges): Promise<Cart> {
  return (await (await send(`/table/cart/lines/${id}`, json('PATCH', changes))).json()) as Cart
}

/**
 * Removes a line and returns the cart. A line already gone (someone else removed it) counts as
 * done: the cart is reloaded instead.
 */
export async function removeCartLine(id: string): Promise<Cart> {
  try {
    return (await (await send(`/table/cart/lines/${id}`, { method: 'DELETE' })).json()) as Cart
  } catch (error) {
    if (error instanceof OrderingError && error.status === 404) return fetchCart()
    throw error
  }
}

/**
 * Sends the cart as one order. `cartVersion` is the version the sender reviewed: if anyone changed
 * the cart since, the server answers 409 "The order changed, review it". `id` is kept until the send
 * succeeds, so a retry after a lost answer never sends the order twice.
 */
export async function submitOrder(id: string, cartVersion: number): Promise<Order> {
  return (await (await send('/table/orders', json('POST', { id, cart_version: cartVersion }))).json()) as Order
}

/** The orders of this visit, oldest first. */
export async function fetchOrders(): Promise<Order[]> {
  return (await (await send('/table/orders')).json()) as Order[]
}

/** When the table asked for the bill on this visit, or null. */
export async function fetchBillRequest(): Promise<string | null> {
  return ((await (await send('/table/bill-request')).json()) as { requested_at: string | null }).requested_at
}

/** Alerts the waiter that the table wants to pay. Asking again keeps the first request. */
export async function requestBill(): Promise<string> {
  return ((await (await send('/table/bill-request', { method: 'POST' })).json()) as { requested_at: string })
    .requested_at
}

/** The table no longer wants the bill; cancelling nothing is fine. */
export async function cancelBillRequest(): Promise<void> {
  await send('/table/bill-request', { method: 'DELETE' })
}
