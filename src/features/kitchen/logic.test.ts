import { describe, expect, it } from 'vitest'
import type { StaffOrder, StaffOrderItem } from './api.ts'
import {
  chunk,
  isLate,
  kitchenActions,
  kitchenQueue,
  newIds,
  pendingSelection,
  rejectReasonError,
  replaceOrder,
  staffItemLabel,
  staffItemTone,
  waitingLabel,
} from './logic.ts'

function item(id: string, status: StaffOrderItem['status']): StaffOrderItem {
  return {
    id,
    name: `Dish ${id}`,
    quantity: 1,
    note: '',
    added_by: 'Guest 1',
    status,
    cancel_reason: null,
    ready_at: null,
    updated_at: '2026-10-28T12:00:00Z',
    modifiers: [],
  }
}

function order(id: string, number: number, items: StaffOrderItem[]): StaffOrder {
  return {
    id,
    number,
    table_id: 't1',
    table_name: 'Table 1',
    sent_by: 'Guest 1',
    created_at: '2026-10-28T12:00:00Z',
    status: 'queued',
    items,
  }
}

describe('kitchenQueue', () => {
  it('keeps orders with dishes still to cook, oldest number first', () => {
    const queue = kitchenQueue([
      order('o3', 3, [item('a', 'queued')]),
      order('o1', 1, [item('b', 'preparing'), item('c', 'ready')]),
      order('o2', 2, [item('d', 'ready'), item('e', 'cancelled')]),
    ])

    expect(queue.map((o) => o.number)).toEqual([1, 3])
  })
})

describe('replaceOrder', () => {
  it('replaces the order in place and drops it once the queue no longer wants it', () => {
    const orders = [order('o1', 1, [item('a', 'queued')]), order('o2', 2, [item('b', 'queued')])]
    const keep = (o: StaffOrder) => o.items.some((i) => i.status === 'queued' || i.status === 'preparing')

    expect(replaceOrder(orders, order('o1', 1, [item('a', 'preparing')]), keep).map((o) => o.items[0].status)).toEqual([
      'preparing',
      'queued',
    ])
    expect(replaceOrder(orders, order('o1', 1, [item('a', 'ready')]), keep).map((o) => o.id)).toEqual(['o2'])
  })

  it('ignores an order the screen no longer shows', () => {
    const orders = [order('o1', 1, [item('a', 'queued')])]
    expect(replaceOrder(orders, order('o9', 9, [item('z', 'ready')]), () => true)).toEqual(orders)
  })
})

describe('kitchenActions', () => {
  it('offers nothing without a selection', () => {
    expect(kitchenActions([])).toEqual({ start: false, ready: false, reject: false })
  })

  it('lets queued dishes start, be ready or be rejected', () => {
    expect(kitchenActions([item('a', 'queued'), item('b', 'queued')])).toEqual({ start: true, ready: true, reject: true })
  })

  it('only offers Ready once any selected dish is being prepared', () => {
    expect(kitchenActions([item('a', 'queued'), item('b', 'preparing')])).toEqual({
      start: false,
      ready: true,
      reject: false,
    })
  })

  it('offers nothing for dishes that left the kitchen', () => {
    expect(kitchenActions([item('a', 'ready')])).toEqual({ start: false, ready: false, reject: false })
  })
})

describe('pendingSelection', () => {
  it('keeps only selected dishes that are still in the kitchen', () => {
    const current = order('o1', 1, [item('a', 'queued'), item('b', 'ready'), item('c', 'preparing')])
    expect(pendingSelection(new Set(['a', 'b', 'gone']), current).map((i) => i.id)).toEqual(['a'])
  })
})

describe('waiting time', () => {
  const sent = '2026-10-28T12:00:00Z'
  const at = (minutes: number) => Date.parse(sent) + minutes * 60_000

  it('reads like a clock a cook glances at', () => {
    expect(waitingLabel(sent, at(0.5))).toBe('Just now')
    expect(waitingLabel(sent, at(12))).toBe('12 min')
    expect(waitingLabel(sent, at(65))).toBe('1 h 5 min')
    expect(waitingLabel('not a date', at(1))).toBe('')
  })

  it('flags orders waiting longer than the threshold', () => {
    expect(isLate(sent, at(15), 15)).toBe(false)
    expect(isLate(sent, at(16), 15)).toBe(true)
    expect(isLate('not a date', at(99), 15)).toBe(false)
  })
})

describe('newIds', () => {
  it('reports nothing on the first load and then only what appeared', () => {
    expect(newIds(null, ['a', 'b'])).toEqual([])
    expect(newIds(new Set(['a']), ['a', 'b', 'c'])).toEqual(['b', 'c'])
  })
})

describe('rejectReasonError', () => {
  it('asks for a reason between 1 and 200 characters', () => {
    expect(rejectReasonError('   ')).toBe('Write why the dish is rejected.')
    expect(rejectReasonError('x'.repeat(201))).toBe('Keep the reason under 200 characters.')
    expect(rejectReasonError(' Out of avocado ')).toBeNull()
  })
})

describe('chunk', () => {
  it('splits ids into requests the server accepts', () => {
    expect(chunk(['a', 'b', 'c'], 2)).toEqual([['a', 'b'], ['c']])
    expect(chunk([], 2)).toEqual([])
  })
})

describe('staff item labels', () => {
  it('names each dish status and colors the ones that need attention', () => {
    expect(staffItemLabel('cancelled')).toBe('Rejected')
    expect(staffItemTone('preparing')).toBe('warning')
    expect(staffItemTone('ready')).toBe('success')
    expect(staffItemTone('queued')).toBe('neutral')
  })
})
