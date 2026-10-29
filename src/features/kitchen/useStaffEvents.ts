import { useLiveEvents } from '../ordering/useLiveEvents.ts'

const EVENTS_URL = '/api/v1/staff/events'

export type StaffEvent =
  | 'order.created'
  | 'order.updated'
  | 'bill.opened'
  | 'bill.closed'
  | 'bill.requested'
  | 'bill.request_cleared'

/**
 * Live updates of every order and table of the business, for the kitchen and the waiters.
 * `onEvent` receives the event name and its raw data; `onRefresh` reloads everything (on (re)connect, when the
 * tab comes back, and every few seconds while the stream is down).
 */
export function useStaffEvents(onEvent: (event: StaffEvent, data: string) => void, onRefresh: () => void): void {
  useLiveEvents({
    url: EVENTS_URL,
    events: {
      'order.created': (data) => onEvent('order.created', data),
      'order.updated': (data) => onEvent('order.updated', data),
      'bill.opened': (data) => onEvent('bill.opened', data),
      'bill.closed': (data) => onEvent('bill.closed', data),
      'bill.requested': (data) => onEvent('bill.requested', data),
      'bill.request_cleared': (data) => onEvent('bill.request_cleared', data),
    },
    onRefresh,
  })
}
