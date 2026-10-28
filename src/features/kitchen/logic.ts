/** Pure rules of the kitchen and delivery screens, kept apart from React so they can be tested on their own. */
import type { OrderItemStatus } from '../ordering/api.ts'
import type { StatusTone } from '../ordering/logic.ts'
import type { StaffOrder, StaffOrderItem } from './api.ts'

export const MAX_REASON_LENGTH = 200
/** The server accepts this many dishes per status change. */
export const MAX_ITEMS_PER_CHANGE = 50

/** A dish the kitchen still has to cook. */
export function isPending(item: Pick<StaffOrderItem, 'status'>): boolean {
  return item.status === 'queued' || item.status === 'preparing'
}

export function hasPending(order: StaffOrder): boolean {
  return order.items.some(isPending)
}

/** Orders with dishes still to cook, oldest number first (a suggestion: any order can go first). */
export function kitchenQueue(orders: StaffOrder[]): StaffOrder[] {
  return orders.filter(hasPending).sort((a, b) => a.number - b.number)
}

/**
 * Puts a changed order where it was. When the queue no longer wants it (`keep` is false) it leaves
 * the screen; an order the screen does not show is ignored (the next reload brings it if needed).
 */
export function replaceOrder(orders: StaffOrder[], updated: StaffOrder, keep: (order: StaffOrder) => boolean): StaffOrder[] {
  if (!orders.some((order) => order.id === updated.id)) return orders
  if (!keep(updated)) return orders.filter((order) => order.id !== updated.id)
  return orders.map((order) => (order.id === updated.id ? updated : order))
}

export interface KitchenActions {
  /** Every selected dish is queued: it can start. */
  start: boolean
  /** Every selected dish is queued or being prepared: it can be marked ready. */
  ready: boolean
  /** Every selected dish is queued: it can be rejected (with a reason). */
  reject: boolean
}

export function kitchenActions(selected: Pick<StaffOrderItem, 'status'>[]): KitchenActions {
  if (selected.length === 0) return { start: false, ready: false, reject: false }
  const allQueued = selected.every((item) => item.status === 'queued')
  return { start: allQueued, ready: selected.every(isPending), reject: allQueued }
}

/** The selected dishes of `order` that are still in the kitchen (others changed meanwhile). */
export function pendingSelection(selected: ReadonlySet<string>, order: StaffOrder): StaffOrderItem[] {
  return order.items.filter((item) => selected.has(item.id) && isPending(item))
}

function minutesSince(iso: string, now: number): number | null {
  const start = Date.parse(iso)
  if (Number.isNaN(start)) return null
  return Math.max(0, (now - start) / 60_000)
}

/** How long an order has waited, like "12 min" or "1 h 5 min". */
export function waitingLabel(since: string, now: number): string {
  const minutes = minutesSince(since, now)
  if (minutes === null) return ''
  if (minutes < 1) return 'Just now'
  const whole = Math.floor(minutes)
  if (whole < 60) return `${whole} min`
  return `${Math.floor(whole / 60)} h ${whole % 60} min`
}

/** An order waiting longer than the business threshold is highlighted. */
export function isLate(since: string, now: number, lateMinutes: number): boolean {
  const minutes = minutesSince(since, now)
  return minutes !== null && minutes > lateMinutes
}

/** Ids that were not there before; nothing on the first load (`previous` null), so it never alerts on opening. */
export function newIds(previous: ReadonlySet<string> | null, ids: string[]): string[] {
  if (previous === null) return []
  return ids.filter((id) => !previous.has(id))
}

export function rejectReasonError(reason: string): string | null {
  const trimmed = reason.trim()
  if (trimmed.length === 0) return 'Write why the dish is rejected.'
  if (trimmed.length > MAX_REASON_LENGTH) return `Keep the reason under ${MAX_REASON_LENGTH} characters.`
  return null
}

export function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let start = 0; start < values.length; start += size) chunks.push(values.slice(start, start + size))
  return chunks
}

const KITCHEN_LABELS: Record<OrderItemStatus, string> = {
  queued: 'Queued',
  preparing: 'Preparing',
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Rejected',
}

export function staffItemLabel(status: OrderItemStatus): string {
  return KITCHEN_LABELS[status]
}

const KITCHEN_TONES: Record<OrderItemStatus, StatusTone> = {
  queued: 'neutral',
  preparing: 'warning',
  ready: 'success',
  delivered: 'success',
  cancelled: 'neutral',
}

export function staffItemTone(status: OrderItemStatus): StatusTone {
  return KITCHEN_TONES[status]
}
