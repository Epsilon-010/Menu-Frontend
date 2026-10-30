import { describe, expect, it } from 'vitest'
import type { TableOverview } from '../bills/api.ts'
import type { StaffOrder, StaffOrderItem } from '../kitchen/api.ts'
import type { OrderItem } from '../ordering/api.ts'
import {
  deliveryCounter,
  deliveryTables,
  filterByTable,
  hasReady,
  newRejections,
  readyIds,
  splitDelivery,
  visibleSections,
} from './logic.ts'

function item(id: string, status: StaffOrderItem['status'], cancel_reason: string | null = null): StaffOrderItem {
  return {
    id,
    name: `Dish ${id}`,
    quantity: 1,
    note: '',
    added_by: 'Guest 1',
    status,
    cancel_reason,
    ready_at: status === 'ready' ? '2026-10-28T12:05:00Z' : null,
    updated_at: '2026-10-28T12:05:00Z',
    modifiers: [],
  }
}

function order(id: string, number: number, tableId: string, tableName: string, items: StaffOrderItem[]): StaffOrder {
  return {
    id,
    number,
    table_id: tableId,
    table_name: tableName,
    sent_by: 'Guest 1',
    created_at: '2026-10-28T12:00:00Z',
    status: 'in_progress',
    items,
  }
}

const ORDER_12 = order('o12', 12, 't1', 'Table 1', [
  item('a', 'ready'),
  item('b', 'delivered'),
  item('c', 'delivered'),
  item('d', 'preparing'),
  item('e', 'queued'),
  item('f', 'cancelled', 'Out of avocado'),
])

describe('splitDelivery', () => {
  it('separates dishes ready to take, delivered, still in the kitchen and rejected', () => {
    const groups = splitDelivery(ORDER_12)

    expect(groups.ready.map((i) => i.id)).toEqual(['a'])
    expect(groups.delivered.map((i) => i.id)).toEqual(['b', 'c'])
    expect(groups.inKitchen.map((i) => i.id)).toEqual(['d', 'e'])
    expect(groups.rejected.map((i) => i.id)).toEqual(['f'])
  })
})

describe('deliveryCounter', () => {
  it('counts delivered dishes against the ones still owed, leaving rejected dishes out', () => {
    expect(deliveryCounter(ORDER_12)).toBe('Table 1 · Order #12 · 2 of 5 delivered')
  })

  it('reads the done when scenario: 2 ready and 2 still cooking', () => {
    const second = order('o2', 2, 't5', 'Table 5', [
      item('a', 'ready'),
      item('b', 'ready'),
      item('c', 'queued'),
      item('d', 'queued'),
    ])
    expect(deliveryCounter(second)).toBe('Table 5 · Order #2 · 0 of 4 delivered')
    expect(splitDelivery(second).ready).toHaveLength(2)
    expect(splitDelivery(second).inKitchen).toHaveLength(2)
  })
})

describe('hasReady and readyIds', () => {
  it('tells which orders still have dishes to take and lists those dishes', () => {
    const done = order('o1', 1, 't1', 'Table 1', [item('x', 'delivered')])

    expect(hasReady(ORDER_12)).toBe(true)
    expect(hasReady(done)).toBe(false)
    expect(readyIds([ORDER_12, done])).toEqual(['a'])
  })
})

describe('table filter', () => {
  const orders = [
    ORDER_12,
    order('o3', 3, 't10', 'Table 10', [item('g', 'ready')]),
    order('o4', 4, 't2', 'Table 2', [item('h', 'ready')]),
    order('o5', 5, 't1', 'Table 1', [item('i', 'ready')]),
  ]

  it('offers each table once, in natural order', () => {
    expect(deliveryTables(orders)).toEqual([
      { id: 't1', name: 'Table 1' },
      { id: 't2', name: 'Table 2' },
      { id: 't10', name: 'Table 10' },
    ])
  })

  it('keeps the server order and shows one table or all', () => {
    expect(filterByTable(orders, 't1').map((o) => o.number)).toEqual([12, 5])
    expect(filterByTable(orders, null).map((o) => o.number)).toEqual([12, 3, 4, 5])
  })
})

function tableItem(id: string, status: OrderItem['status'], cancel_reason: string | null = null): OrderItem {
  return {
    id,
    item_id: `m-${id}`,
    name: `Dish ${id}`,
    quantity: 1,
    note: '',
    added_by: 'Guest 1',
    status,
    cancel_reason,
    unit_price_cents: 100,
    subtotal_cents: 100,
    modifiers: [],
  }
}

function tables(items: OrderItem[]): TableOverview[] {
  return [
    {
      table_id: 't1',
      table_name: 'Table 1',
      bill: {
        id: 'b1',
        table_id: 't1',
        table_name: 'Table 1',
        opened_at: '2026-10-28T12:00:00Z',
        closed_at: null,
        payment_method: null,
        bill_requested_at: null,
        orders: [
          {
            id: 'o7',
            number: 7,
            status: 'in_progress',
            sent_by: 'Guest 1',
            created_at: '2026-10-28T12:00:00Z',
            items,
            total_cents: 100,
          },
        ],
        total_cents: 100,
      },
    },
    { table_id: 't2', table_name: 'Table 2', bill: null },
  ]
}

describe('newRejections', () => {
  it('stays quiet on the first load, then reports each newly rejected dish once', () => {
    const first = newRejections(null, tables([tableItem('a', 'cancelled', 'Old'), tableItem('b', 'queued')]))
    expect(first.rejections).toEqual([])

    const second = newRejections(first.seen, tables([tableItem('a', 'cancelled', 'Old'), tableItem('b', 'cancelled', 'Out of avocado')]))
    expect(second.rejections).toEqual([
      { id: 'b', table_name: 'Table 1', order_number: 7, name: 'Dish b', note: 'Rejected: Out of avocado' },
    ])

    const third = newRejections(second.seen, tables([tableItem('a', 'cancelled', 'Old'), tableItem('b', 'cancelled', 'Out of avocado')]))
    expect(third.rejections).toEqual([])
  })
})

describe('newRejections with options', () => {
  it('names the options of a rejected dish so the waiter tells the right one', () => {
    const large = { ...tableItem('c', 'queued'), modifiers: [{ group: 'Size', name: 'Large', price_cents: 1500 }] }
    const first = newRejections(null, tables([large]))

    const second = newRejections(first.seen, tables([{ ...large, status: 'cancelled', cancel_reason: 'Out of stock' }]))

    expect(second.rejections.map((each) => each.name)).toEqual(['Dish c (Size: Large)'])
  })
})

describe('visibleSections', () => {
  it('shows only the dishes to take, or the whole order', () => {
    expect(visibleSections('ready')).toEqual(['ready'])
    expect(visibleSections('all')).toEqual(['ready', 'inKitchen', 'delivered', 'rejected'])
  })
})
