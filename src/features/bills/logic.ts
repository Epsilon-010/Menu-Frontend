/** Pure rules of the waiter's corrections to sent orders, kept apart from React so they can be tested. */
import { MAX_NOTE_LENGTH, MAX_QUANTITY, MIN_QUANTITY, type OrderItem } from '../ordering/api.ts'
import type { Bill } from './api.ts'

/** A paid bill is frozen: its orders accept no new dishes. */
export function acceptsNewDishes(bill: Pick<Bill, 'closed_at'>): boolean {
  return bill.closed_at === null
}

/** Only dishes the kitchen has not started can be cancelled, and only while the bill is open. */
export function canCancelDish(bill: Pick<Bill, 'closed_at'>, item: Pick<OrderItem, 'status'>): boolean {
  return acceptsNewDishes(bill) && item.status === 'queued'
}

export function dishDraftError(itemId: string, quantity: number, note: string): string | null {
  if (itemId === '') return 'Choose a dish.'
  if (!Number.isInteger(quantity) || quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
    return `Choose a quantity from ${MIN_QUANTITY} to ${MAX_QUANTITY}.`
  }
  if (note.trim().length > MAX_NOTE_LENGTH) return `Keep the note under ${MAX_NOTE_LENGTH} characters.`
  return null
}
