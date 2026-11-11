/** Pure rules of the waiter's corrections to sent orders, kept apart from React so they can be tested. */
import { MAX_NOTE_LENGTH, MAX_QUANTITY, MIN_QUANTITY, type ModifierGroup, type OrderItem } from '../ordering/api.ts'
import { parsePrice } from '../catalog/price.ts'
import { dishLabel, selectionError } from '../ordering/modifiers.ts'
import type { Bill, TableOverview } from './api.ts'

/** A paid bill is frozen: its orders accept no new dishes. */
export function acceptsNewDishes(bill: Pick<Bill, 'closed_at'>): boolean {
  return bill.closed_at === null
}

/** A bill of $0 (no orders, or every dish cancelled) is closed, never paid: the API refuses a $0 payment. */
export function hasSomethingToCharge(bill: Pick<Bill, 'total_cents'>): boolean {
  return bill.total_cents > 0
}

/**
 * How many dishes of the bill have not reached the table (by quantity; cancelled ones are not owed).
 * Paying freezes the bill, so the kitchen and the waiters stop seeing whatever is still pending.
 */
export function undeliveredDishes(bill: Pick<Bill, 'orders'>): number {
  let pending = 0
  for (const order of bill.orders) {
    for (const item of order.items) {
      if (item.status !== 'delivered' && item.status !== 'cancelled') pending += item.quantity
    }
  }
  return pending
}

/** What a payment covers: only the dishes that reached the table, or every dish of the bill. */
export type ChargeScope = 'delivered' | 'all'

/** One dish of the bill as the payment summary lists it. */
export interface ChargeLine {
  id: string
  quantity: number
  name: string
  subtotal_cents: number
  delivered: boolean
}

/** Every dish the bill still owes (cancelled ones are not charged), in the order they were sent. */
export function chargeLines(bill: Pick<Bill, 'orders'>): ChargeLine[] {
  const lines: ChargeLine[] = []
  for (const order of bill.orders) {
    for (const item of order.items) {
      if (item.status === 'cancelled') continue
      lines.push({
        id: item.id,
        quantity: item.quantity,
        name: dishLabel(item.name, item.modifiers),
        subtotal_cents: item.subtotal_cents,
        delivered: item.status === 'delivered',
      })
    }
  }
  return lines
}

/** What the bill adds up to counting only the dishes that reached the table. */
export function deliveredTotalCents(bill: Pick<Bill, 'orders'>): number {
  return chargeLines(bill).reduce((total, line) => total + (line.delivered ? line.subtotal_cents : 0), 0)
}

/**
 * Charging only what was delivered makes sense when something was delivered and something was not;
 * otherwise the payment covers the whole bill.
 */
export function chargeScopeFor(bill: Pick<Bill, 'orders'>, wanted: ChargeScope): ChargeScope {
  return wanted === 'delivered' && undeliveredDishes(bill) > 0 && deliveredTotalCents(bill) > 0 ? 'delivered' : 'all'
}

export function chargeTotalCents(bill: Pick<Bill, 'orders' | 'total_cents'>, scope: ChargeScope): number {
  return scope === 'delivered' ? deliveredTotalCents(bill) : bill.total_cents
}

/** What the payment dialog shows and sends: the amount on screen always is the amount the server is asked to charge. */
export interface PaymentRequest {
  scope: ChargeScope
  totalCents: number
  onlyDelivered: boolean
}

export function paymentRequestFor(bill: Pick<Bill, 'orders' | 'total_cents'>, wanted: ChargeScope): PaymentRequest {
  const scope = chargeScopeFor(bill, wanted)
  return { scope, totalCents: chargeTotalCents(bill, scope), onlyDelivered: scope === 'delivered' }
}

/**
 * The change for a cash payment: cents to give back (0 or more), a negative amount when the cash does not
 * cover the total, or null while nothing valid is typed.
 */
export function changeDueCents(received: string, totalCents: number): number | null {
  const cents = parsePrice(received)
  return cents === null ? null : cents - totalCents
}

/** Only dishes the kitchen has not started can be cancelled, and only while the bill is open. */
export function canCancelDish(bill: Pick<Bill, 'closed_at'>, item: Pick<OrderItem, 'status'>): boolean {
  return acceptsNewDishes(bill) && item.status === 'queued'
}

export function dishDraftError(
  itemId: string,
  quantity: number,
  note: string,
  groups: ModifierGroup[] = [],
  selected: readonly string[] = [],
): string | null {
  if (itemId === '') return 'Elige un platillo.'
  if (!Number.isInteger(quantity) || quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
    return `Elige una cantidad de ${MIN_QUANTITY} a ${MAX_QUANTITY}.`
  }
  if (note.trim().length > MAX_NOTE_LENGTH) return `La nota debe tener menos de ${MAX_NOTE_LENGTH} caracteres.`
  const options = selectionError(groups, selected)
  return options === null ? null : `${options}.`
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

/** A table chosen to be shown (a click on the list, a tap on a banner) and its turn from `nextTableChoice`. */
export interface TableChoice {
  tableId: string
  at: number
}

/** Of a choice made outside the list and one made on it, the later one; a tie goes to the outside one. */
export function latestTableChoice(outside: TableChoice | null, picked: TableChoice | null): string | null {
  if (outside && (!picked || outside.at >= picked.at)) return outside.tableId
  return picked?.tableId ?? null
}

/** The open table to show: the chosen one while it is still open, else the first (the longest waiting for its bill). */
export function shownOpenTable(open: TableOverview[], chosenId: string | null): TableOverview | null {
  return open.find((table) => table.table_id === chosenId) ?? open[0] ?? null
}

let tableChoices = 0

/** A growing number for each choice of a table (a click on the list, a tap on a banner), so the newest one wins. */
export function nextTableChoice(): number {
  tableChoices += 1
  return tableChoices
}
