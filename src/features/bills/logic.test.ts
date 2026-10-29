import { describe, expect, it } from 'vitest'
import type { Order, OrderItem } from '../ordering/api.ts'
import type { Bill, TableOverview } from './api.ts'
import {
  acceptsNewDishes,
  billRequests,
  canCancelDish,
  dishDraftError,
  newBillRequests,
  tableIdOf,
  tablesForWaiter,
  withoutTable,
} from './logic.ts'

function dish(status: OrderItem['status']): OrderItem {
  return {
    id: `d-${status}`,
    item_id: 'm1',
    name: 'Dish',
    quantity: 1,
    note: '',
    added_by: 'Guest 1',
    status,
    cancel_reason: status === 'cancelled' ? 'Out of stock' : null,
    unit_price_cents: 100,
    subtotal_cents: 100,
  }
}

const ORDER: Order = {
  id: 'o1',
  number: 4,
  status: 'queued',
  sent_by: 'Guest 1',
  created_at: '2026-10-28T12:00:00Z',
  items: [],
  total_cents: 0,
}

function bill(closed_at: string | null): Bill {
  return {
    id: 'b1',
    table_id: 't5',
    table_name: 'Table 5',
    opened_at: '2026-10-28T12:00:00Z',
    closed_at,
    payment_method: closed_at ? 'cash' : null,
    bill_requested_at: null,
    orders: [ORDER],
    total_cents: 0,
  }
}

describe('canCancelDish', () => {
  it('lets staff cancel only dishes the kitchen has not started, on an open bill', () => {
    expect(canCancelDish(bill(null), dish('queued'))).toBe(true)
    for (const status of ['preparing', 'ready', 'delivered', 'cancelled'] as const) {
      expect(canCancelDish(bill(null), dish(status))).toBe(false)
    }
    expect(canCancelDish(bill('2026-10-28T13:00:00Z'), dish('queued'))).toBe(false)
  })
})

describe('acceptsNewDishes', () => {
  it('accepts new dishes until the bill is paid', () => {
    expect(acceptsNewDishes(bill(null))).toBe(true)
    expect(acceptsNewDishes(bill('2026-10-28T13:00:00Z'))).toBe(false)
  })
})

describe('dishDraftError', () => {
  it('needs a dish, 1 to 50 of them and a note up to 200 characters', () => {
    expect(dishDraftError('', 1, '')).toBe('Choose a dish.')
    expect(dishDraftError('m1', 0, '')).toBe('Choose a quantity from 1 to 50.')
    expect(dishDraftError('m1', 51, '')).toBe('Choose a quantity from 1 to 50.')
    expect(dishDraftError('m1', 1.5, '')).toBe('Choose a quantity from 1 to 50.')
    expect(dishDraftError('m1', 2, 'x'.repeat(201))).toBe('Keep the note under 200 characters.')
    expect(dishDraftError('m1', 2, 'No onion')).toBeNull()
  })
})

function table(id: string, requestedAt: string | null | 'closed'): TableOverview {
  const name = `Table ${id}`
  if (requestedAt === 'closed') return { table_id: id, table_name: name, bill: null }
  return {
    table_id: id,
    table_name: name,
    bill: { ...bill(null), id: `b${id}`, table_id: id, table_name: name, bill_requested_at: requestedAt },
  }
}

describe('bill requests', () => {
  const tables = [
    table('1', null),
    table('2', '2026-10-28T18:30:00Z'),
    table('3', 'closed'),
    table('4', '2026-10-28T18:20:00Z'),
  ]

  it('lists the tables waiting for their bill, the longest waiting first', () => {
    expect(billRequests(tables)).toEqual([
      { table_id: '4', table_name: 'Table 4', bill_id: 'b4', requested_at: '2026-10-28T18:20:00Z' },
      { table_id: '2', table_name: 'Table 2', bill_id: 'b2', requested_at: '2026-10-28T18:30:00Z' },
    ])
  })

  it('puts those tables on top and keeps the others in their order', () => {
    expect(tablesForWaiter(tables).map((overview) => overview.table_id)).toEqual(['4', '2', '1', '3'])
  })

  it('alerts once per request, and not for those already waiting when the screen opened', () => {
    const openedAt = Date.parse('2026-10-28T18:35:00Z')
    const first = newBillRequests(null, tables, openedAt)
    expect(first.fresh).toBe(0)

    const asked = [...tables.slice(0, 3), table('4', '2026-10-28T18:20:00Z'), table('1', '2026-10-28T18:40:00Z')]
    const second = newBillRequests(first.seen, asked, openedAt)
    expect(second.fresh).toBe(1)
    expect(newBillRequests(second.seen, asked, openedAt).fresh).toBe(0)

    // Cancelled and asked again: a new request, a new alert.
    const again = newBillRequests(second.seen, [table('1', '2026-10-28T18:50:00Z')], openedAt)
    expect(again.fresh).toBe(1)
  })

  it('still alerts for a request made after the screen opened when the first load failed', () => {
    const openedAt = Date.parse('2026-10-28T18:25:00Z')
    // Table 4 asked before the screen opened, table 2 while the list could not load.
    expect(newBillRequests(null, tables, openedAt).fresh).toBe(1)
  })

  it('drops a table from the banner as soon as its request ends', () => {
    expect(withoutTable(billRequests(tables), '4').map((request) => request.table_id)).toEqual(['2'])
  })

  it('reads the table of a staff event', () => {
    expect(tableIdOf('{"table_id":"t1"}')).toBe('t1')
    expect(tableIdOf('{"order_id":"o1"}')).toBeNull()
    expect(tableIdOf('not json')).toBeNull()
  })
})
