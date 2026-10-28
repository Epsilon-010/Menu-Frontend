import { describe, expect, it } from 'vitest'
import type { Order, OrderItem } from '../ordering/api.ts'
import type { Bill } from './api.ts'
import { acceptsNewDishes, canCancelDish, dishDraftError } from './logic.ts'

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
