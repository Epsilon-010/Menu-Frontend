/** Pure rules of the table screen, kept apart from React so they can be tested on their own. */
import type { Cart, CartLine, Order, OrderItemStatus, OrderStatus } from './api.ts'

export interface PersonLines<Line> {
  person: string
  lines: Line[]
  /** Sum of the available lines only, in cents. */
  subtotal_cents: number
}

/** Lines grouped by who added them, in the order each person first appears. */
export function groupByPerson<Line extends Pick<CartLine, 'added_by' | 'subtotal_cents'> & { available?: boolean }>(
  lines: Line[],
): PersonLines<Line>[] {
  const groups = new Map<string, PersonLines<Line>>()
  for (const line of lines) {
    let group = groups.get(line.added_by)
    if (!group) {
      group = { person: line.added_by, lines: [], subtotal_cents: 0 }
      groups.set(line.added_by, group)
    }
    group.lines.push(line)
    if (line.available !== false) group.subtotal_cents += line.subtotal_cents
  }
  return [...groups.values()]
}

/** A `cart.updated` event only needs a reload when it announces a version other than the one on screen. */
export function needsCartReload(eventVersion: number, shownVersion: number | null): boolean {
  return shownVersion === null || eventVersion !== shownVersion
}

/** Reads `cart_version` out of a `cart.updated` event's data; null when it is not there. */
export function cartVersionOf(data: string): number | null {
  try {
    const parsed = JSON.parse(data) as { cart_version?: unknown }
    return typeof parsed.cart_version === 'number' ? parsed.cart_version : null
  } catch {
    return null
  }
}

/** How many dishes the cart holds (quantities added up), unavailable ones excluded. */
export function dishCount(cart: Cart): number {
  return cart.lines.reduce((count, line) => count + (line.available ? line.quantity : 0), 0)
}

/** Names of the cart lines whose items the server reported as no longer available. */
export function unavailableNames(lines: Pick<CartLine, 'item_id' | 'name'>[], itemIds: string[]): string[] {
  const ids = new Set(itemIds)
  return [...new Set(lines.filter((line) => ids.has(line.item_id)).map((line) => line.name))]
}

/** Draft key of an add: the same item, quantity and note reuse the client id; anything else is a new add. */
export function lineDraftKey(itemId: string, quantity: number, note: string): string {
  return JSON.stringify([itemId, quantity, note.trim()])
}

const ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  queued: 'Waiting for the kitchen',
  preparing: 'Being prepared',
  ready: 'Ready, on its way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  queued: 'Sent to the kitchen',
  in_progress: 'In the kitchen',
  partially_delivered: 'Partly delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function itemStatusLabel(status: OrderItemStatus): string {
  return ITEM_STATUS_LABELS[status]
}

export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status]
}

/** What the table and the waiters read under a rejected dish: "Rejected: <reason>". */
export function rejectionNote(item: { status: OrderItemStatus; cancel_reason: string | null }): string | null {
  if (item.status !== 'cancelled') return null
  const reason = item.cancel_reason?.trim()
  return reason ? `Rejected: ${reason}` : 'Rejected'
}

export type StatusTone = 'neutral' | 'warning' | 'success'

export function itemStatusTone(status: OrderItemStatus): StatusTone {
  if (status === 'ready') return 'warning'
  if (status === 'delivered') return 'success'
  return 'neutral'
}

/** Waits before reconnecting the live stream: 1 s, 2 s, 4 s... capped at 30 s. */
export function reconnectDelay(attempt: number): number {
  return Math.min(30_000, 1_000 * 2 ** Math.max(0, attempt))
}

/** Clock time of an ISO timestamp, like "14:05". */
export function clockTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/**
 * Sends orders with a client id kept until one succeeds: a retry after a lost answer (or after
 * reviewing a changed cart) reuses it, so the table never sends the same order twice.
 */
export function createOrderSender(
  submit: (id: string, cartVersion: number) => Promise<Order>,
  newId: () => string = () => crypto.randomUUID(),
) {
  let draftId = newId()
  return {
    get draftId(): string {
      return draftId
    },
    async send(cartVersion: number): Promise<Order> {
      const order = await submit(draftId, cartVersion)
      draftId = newId()
      return order
    },
  }
}
