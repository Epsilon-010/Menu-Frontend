import { ordersRequest, type StaffOrder } from '../kitchen/api.ts'
import { withItemModifiers } from '../ordering/api.ts'

/** Orders with at least one dish ready to take, oldest ready dish first (the server sorts them). */
export async function fetchDeliveries(): Promise<StaffOrder[]> {
  return (await ordersRequest<StaffOrder[]>('/deliveries')).map(withItemModifiers)
}
