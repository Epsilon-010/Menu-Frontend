/** Pure rules of the waiter's corrections to sent orders, kept apart from React so they can be tested. */
import { MAX_NOTE_LENGTH, MAX_QUANTITY, MIN_QUANTITY, type OrderItem } from '../ordering/api.ts'
import type { Bill, TableOverview } from './api.ts'

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

export interface BillRequest {
  table_id: string
  table_name: string
  bill_id: string
  requested_at: string
}

/** The tables waiting for their bill, the longest waiting first. */
export function billRequests(tables: TableOverview[]): BillRequest[] {
  const requests: BillRequest[] = []
  for (const table of tables) {
    const requestedAt = table.bill?.bill_requested_at
    if (table.bill && requestedAt) {
      requests.push({
        table_id: table.table_id,
        table_name: table.table_name,
        bill_id: table.bill.id,
        requested_at: requestedAt,
      })
    }
  }
  return requests.sort((a, b) => Date.parse(a.requested_at) - Date.parse(b.requested_at))
}

/** The tables that asked for the bill on top (longest waiting first); the rest keep the server's order. */
export function tablesForWaiter(tables: TableOverview[]): TableOverview[] {
  const order = new Map(billRequests(tables).map((request, index) => [request.table_id, index]))
  const waiting = tables.filter((table) => order.has(table.table_id))
  waiting.sort((a, b) => (order.get(a.table_id) ?? 0) - (order.get(b.table_id) ?? 0))
  return [...waiting, ...tables.filter((table) => !order.has(table.table_id))]
}

/**
 * How many bill requests appeared since the previous look, so waiters hear each once. On the first
 * look (`previous` null) only requests made after the screen opened (`openedAt`, epoch ms) are new:
 * those already waiting stay silent, but none made while the list could not load is missed.
 * Asking again after cancelling is new.
 */
export function newBillRequests(
  previous: ReadonlySet<string> | null,
  tables: TableOverview[],
  openedAt: number,
): { seen: Set<string>; fresh: number } {
  const requests = billRequests(tables)
  const key = (request: BillRequest) => `${request.bill_id}@${request.requested_at}`
  const fresh =
    previous === null
      ? requests.filter((request) => Date.parse(request.requested_at) > openedAt).length
      : requests.filter((request) => !previous.has(key(request))).length
  return { seen: new Set(requests.map(key)), fresh }
}

/** The banner without a table whose request just ended (attended, cancelled or paid). */
export function withoutTable(requests: BillRequest[], tableId: string): BillRequest[] {
  return requests.filter((request) => request.table_id !== tableId)
}

/** The `table_id` of a staff event, or null. */
export function tableIdOf(data: string): string | null {
  try {
    const parsed = JSON.parse(data) as { table_id?: unknown }
    return typeof parsed.table_id === 'string' ? parsed.table_id : null
  } catch {
    return null
  }
}

/** The id of a table's card, so the bill-request banner can take the waiter to it. */
export function tableCardId(tableId: string): string {
  return `table-${tableId}`
}
