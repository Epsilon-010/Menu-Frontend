import { useLiveEvents } from '../ordering/useLiveEvents.ts'

const EVENTS_URL = '/api/v1/staff/events'

export type StaffEvent = 'order.created' | 'order.updated' | 'bill.opened' | 'bill.closed'

/**
 * Live updates of every order and table of the business, for the kitchen and the waiters.
 * `onEvent` receives the event name; `onRefresh` reloads everything (on (re)connect, when the
 * tab comes back, and every few seconds while the stream is down).
 */
export function useStaffEvents(onEvent: (event: StaffEvent) => void, onRefresh: () => void): void {
  useLiveEvents({
    url: EVENTS_URL,
    events: {
      'order.created': () => onEvent('order.created'),
      'order.updated': () => onEvent('order.updated'),
      'bill.opened': () => onEvent('bill.opened'),
      'bill.closed': () => onEvent('bill.closed'),
    },
    onRefresh,
  })
}
