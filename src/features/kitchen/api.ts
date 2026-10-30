import { apiFetch } from '../../shared/api/http.ts'
import { withItemModifiers, type OrderItemStatus, type OrderStatus } from '../ordering/api.ts'

/** An option chosen for a dish, by name only: the staff queues never show prices. */
export interface StaffModifier {
  group: string
  name: string
}

/** A dish as the staff queues show it: no prices, ever. */
export interface StaffOrderItem {
  id: string
  name: string
  quantity: number
  note: string
  /** Guest name, "Guest N" or "Tablet". */
  added_by: string
  status: OrderItemStatus
  /** Why it was rejected; null unless it is cancelled. */
  cancel_reason: string | null
  ready_at: string | null
  updated_at: string
  /** Chosen options, in the item's group order. */
  modifiers: StaffModifier[]
}

/** An order as the kitchen and the waiters see it (the same shape for both queues). */
export interface StaffOrder {
  id: string
  /** Order number per business, for display only. */
  number: number
  table_id: string
  table_name: string
  sent_by: string
  created_at: string
  status: OrderStatus
  items: StaffOrderItem[]
}

/** The statuses a dish can be moved to. */
export type ItemTarget = 'preparing' | 'ready' | 'delivered' | 'cancelled'

/** The server's message when a dish was already moved by someone else: nothing changed. */
export const DISHES_CHANGED = 'Some dishes already changed; reload the order'

/** Error with a message ready to show to the kitchen or the waiter. */
export class OrdersError extends Error {
  /** HTTP status of the failed request (0 when the server never answered). */
  readonly status: number
  /** The server's own message, without the closing period added for display. */
  readonly detail: string | null

  constructor(message: string, status = 0, detail: string | null = null) {
    super(message)
    this.status = status
    this.detail = detail
  }

  /** Someone else already moved one of the dishes: reload the screen and try again. */
  get dishesChanged(): boolean {
    return this.status === 409 && this.detail === DISHES_CHANGED
  }
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const OFFLINE = 'Could not reach the server. Check your connection and try again.'
const SERVER_FAILED = 'The server could not complete that. Please try again in a moment.'

async function errorFrom(response: Response): Promise<OrdersError> {
  const body = (await response.json().catch(() => null)) as { detail?: unknown } | null
  if (typeof body?.detail === 'string' && response.status < 500) {
    const detail = body.detail
    return new OrdersError(detail.endsWith('.') ? detail : `${detail}.`, response.status, detail)
  }
  if (response.status === 422) return new OrdersError('Please check the fields and try again.', 422)
  return new OrdersError(SERVER_FAILED, response.status)
}

/** Request to the orders API; failures become an `OrdersError` with the server's message. */
export async function ordersRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await apiFetch(path, init)
  } catch {
    throw new OrdersError(OFFLINE)
  }
  if (!response.ok) throw await errorFrom(response)
  return (await response.json()) as T
}

export function jsonBody(method: string, body: unknown): RequestInit {
  return { method, headers: JSON_HEADERS, body: JSON.stringify(body) }
}

/** Orders with dishes still queued or being prepared, oldest number first. */
export async function fetchKitchenOrders(): Promise<StaffOrder[]> {
  return (await ordersRequest<StaffOrder[]>('/kitchen/orders')).map(withItemModifiers)
}

/**
 * Moves one or more dishes of one order to `status`, all or nothing. A rejection (`cancelled`)
 * needs a reason. Answers with the whole order as it is now.
 */
export async function updateItemStatus(
  orderId: string,
  itemIds: string[],
  status: ItemTarget,
  reason?: string,
): Promise<StaffOrder> {
  const body = status === 'cancelled' ? { item_ids: itemIds, status, reason: reason?.trim() ?? '' } : { item_ids: itemIds, status }
  return withItemModifiers(await ordersRequest<StaffOrder>(`/orders/${orderId}/items/status`, jsonBody('POST', body)))
}
