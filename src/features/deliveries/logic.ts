/** Pure rules of the waiter delivery queue, kept apart from React so they can be tested on their own. */
import type { TableOverview } from '../bills/api.ts'
import type { StaffOrder, StaffOrderItem } from '../kitchen/api.ts'
import { isPending } from '../kitchen/logic.ts'
import { rejectionNote } from '../ordering/logic.ts'

export interface DeliveryGroups {
  ready: StaffOrderItem[]
  delivered: StaffOrderItem[]
  inKitchen: StaffOrderItem[]
  rejected: StaffOrderItem[]
}

export type DeliverySection = keyof DeliveryGroups
/** "ready" shows only the dishes to take; "all" shows the whole order. */
export type DeliveryView = 'ready' | 'all'

export function splitDelivery(order: StaffOrder): DeliveryGroups {
  return {
    ready: order.items.filter((item) => item.status === 'ready'),
    delivered: order.items.filter((item) => item.status === 'delivered'),
    inKitchen: order.items.filter(isPending),
    rejected: order.items.filter((item) => item.status === 'cancelled'),
  }
}

/** Like "Table 1 · Order #12 · 2 of 5 delivered"; rejected dishes are not owed, so they are left out. */
export function deliveryCounter(order: StaffOrder): string {
  const owed = order.items.filter((item) => item.status !== 'cancelled')
  const delivered = owed.filter((item) => item.status === 'delivered').length
  return `${order.table_name} · Order #${order.number} · ${delivered} of ${owed.length} delivered`
}

export function hasReady(order: StaffOrder): boolean {
  return order.items.some((item) => item.status === 'ready')
}

export function readyIds(orders: StaffOrder[]): string[] {
  return orders.flatMap((order) => order.items.filter((item) => item.status === 'ready').map((item) => item.id))
}

export interface TableOption {
  id: string
  name: string
}

/** Each table in the queue once, in natural order ("Table 2" before "Table 10"). */
export function deliveryTables(orders: StaffOrder[]): TableOption[] {
  const tables = new Map<string, string>()
  for (const order of orders) tables.set(order.table_id, order.table_name)
  return [...tables]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }))
}

/** One table's orders (or all with null), keeping the server's order: oldest ready dish first. */
export function filterByTable(orders: StaffOrder[], tableId: string | null): StaffOrder[] {
  return tableId === null ? orders : orders.filter((order) => order.table_id === tableId)
}

export function visibleSections(view: DeliveryView): DeliverySection[] {
  return view === 'ready' ? ['ready'] : ['ready', 'inKitchen', 'delivered', 'rejected']
}

export interface Rejection {
  id: string
  table_name: string
  order_number: number
  name: string
  note: string
}

/**
 * Dishes rejected since the previous look at the tables, so waiters hear about each once.
 * The first look (`previous` null) only records what was already rejected.
 */
export function newRejections(
  previous: ReadonlySet<string> | null,
  tables: TableOverview[],
): { seen: Set<string>; rejections: Rejection[] } {
  const seen = new Set<string>()
  const rejections: Rejection[] = []
  for (const table of tables) {
    for (const order of table.bill?.orders ?? []) {
      for (const item of order.items) {
        if (item.status !== 'cancelled') continue
        seen.add(item.id)
        if (previous !== null && !previous.has(item.id)) {
          rejections.push({
            id: item.id,
            table_name: table.table_name,
            order_number: order.number,
            name: item.name,
            note: rejectionNote(item) ?? 'Rejected',
          })
        }
      }
    }
  }
  return { seen, rejections }
}
