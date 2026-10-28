import { cartVersionOf } from './logic.ts'
import { useLiveEvents } from './useLiveEvents.ts'

const EVENTS_URL = '/api/v1/table/events'

export interface TableEventHandlers {
  /** `cart.updated`: another device changed the shared cart to this version. */
  onCartVersion: (version: number) => void
  /** `order.created` or `order.updated`: an order was sent, or the kitchen or a waiter changed its dishes. */
  onOrders: () => void
  /** Reload everything: the stream (re)connected, the tab came back, a bill opened or closed, or a poll. */
  onRefresh: () => void
}

/** Live updates of the table: its shared cart, its orders and their dishes, and its bill. */
export function useTableEvents(handlers: TableEventHandlers): void {
  useLiveEvents({
    url: EVENTS_URL,
    events: {
      'cart.updated': (data) => {
        const version = cartVersionOf(data)
        if (version === null) handlers.onRefresh()
        else handlers.onCartVersion(version)
      },
      'order.created': () => handlers.onOrders(),
      'order.updated': () => handlers.onOrders(),
      'bill.opened': () => handlers.onRefresh(),
      'bill.closed': () => handlers.onRefresh(),
    },
    onRefresh: handlers.onRefresh,
  })
}
