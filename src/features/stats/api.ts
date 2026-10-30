import { jsonBody, ordersRequest } from '../kitchen/api.ts'
import type { DateRange, DayValue } from './logic.ts'

export interface Duration {
  average_seconds: number | null
  median_seconds: number | null
  count: number
}

export interface Statistics {
  from: string
  to: string
  timezone: string
  totals: {
    collected_cents: number
    paid_bills: number
    average_ticket_cents: number
    pending_cents: number
    pending_orders: number
  }
  days: DayValue[]
  payment_methods: { method: 'cash' | 'card' | 'other'; bills: number; amount_cents: number }[]
  products: { item_id: string; name: string; quantity: number; collected_cents: number; pending_cents: number }[]
  tables: { table_id: string; name: string; orders: number; collected_cents: number; pending_cents: number }[]
  times: {
    queue: Duration
    preparation: Duration
    delivery: Duration
    order: Duration
    products: { item_id: string; name: string; queue: Duration; preparation: Duration; delivery: Duration }[]
  }
}

export interface TenantSettings {
  /** IANA time zone in which the statistics cut days. */
  timezone: string
}

export function fetchStatistics(range: DateRange): Promise<Statistics> {
  const query = new URLSearchParams({ from: range.from, to: range.to })
  return ordersRequest<Statistics>(`/stats?${query.toString()}`)
}

export function fetchTenantSettings(): Promise<TenantSettings> {
  return ordersRequest<TenantSettings>('/tenant/settings')
}

export function updateTenantSettings(settings: TenantSettings): Promise<TenantSettings> {
  return ordersRequest<TenantSettings>('/tenant/settings', jsonBody('PATCH', settings))
}
