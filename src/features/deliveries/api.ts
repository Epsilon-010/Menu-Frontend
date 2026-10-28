import { ordersRequest, type StaffOrder } from '../kitchen/api.ts'

/** Orders with at least one dish ready to take, oldest ready dish first (the server sorts them). */
export function fetchDeliveries(): Promise<StaffOrder[]> {
  return ordersRequest<StaffOrder[]>('/deliveries')
}
