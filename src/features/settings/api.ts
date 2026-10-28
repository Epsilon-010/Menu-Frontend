import { jsonBody, ordersRequest } from '../kitchen/api.ts'

export interface OrderSettings {
  /** Orders waiting longer than this are highlighted in the kitchen and delivery queues. */
  late_order_minutes: number
}

export const DEFAULT_LATE_ORDER_MINUTES = 15
export const MIN_LATE_ORDER_MINUTES = 1
export const MAX_LATE_ORDER_MINUTES = 240

export function fetchOrderSettings(): Promise<OrderSettings> {
  return ordersRequest<OrderSettings>('/orders/settings')
}

export function updateOrderSettings(settings: OrderSettings): Promise<OrderSettings> {
  return ordersRequest<OrderSettings>('/orders/settings', jsonBody('PATCH', settings))
}
