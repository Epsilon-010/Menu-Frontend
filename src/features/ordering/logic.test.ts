import { describe, expect, it, vi } from 'vitest'
import type { Order } from './api.ts'
import { formatMoney } from '../catalog/price.ts'
import {
  cartBarTotal,
  cartVersionOf,
  createOrderSender,
  groupByPerson,
  hasSomethingToPay,
  itemStatusLabel,
  lineDraftKey,
  needsCartReload,
  orderStatusLabel,
  reconnectDelay,
  rejectionNote,
  unavailableNames,
} from './logic.ts'

describe('groupByPerson', () => {
  it('groups lines by who added them, in order of first appearance, with their own subtotal', () => {
    const groups = groupByPerson([
      { id: 'a', added_by: 'Guest 1', subtotal_cents: 500, available: true },
      { id: 'b', added_by: 'Tablet', subtotal_cents: 300, available: true },
      { id: 'c', added_by: 'Guest 1', subtotal_cents: 200, available: true },
    ])

    expect(groups.map((group) => [group.person, group.lines.map((line) => line.id), group.subtotal_cents])).toEqual([
      ['Guest 1', ['a', 'c'], 700],
      ['Tablet', ['b'], 300],
    ])
  })

  it('keeps unavailable lines in the group but out of its subtotal', () => {
    const [group] = groupByPerson([
      { added_by: 'Guest 2', subtotal_cents: 400, available: true },
      { added_by: 'Guest 2', subtotal_cents: 900, available: false },
    ])

    expect(group.lines).toHaveLength(2)
    expect(group.subtotal_cents).toBe(400)
  })
})

describe('needsCartReload', () => {
  it('reloads only when the event announces a version other than the one shown', () => {
    expect(needsCartReload(4, 4)).toBe(false)
    expect(needsCartReload(5, 4)).toBe(true)
    expect(needsCartReload(1, 9)).toBe(true)
    expect(needsCartReload(0, null)).toBe(true)
  })

  it('reads the version from the event data and ignores malformed data', () => {
    expect(cartVersionOf('{"cart_version": 12}')).toBe(12)
    expect(cartVersionOf('{}')).toBeNull()
    expect(cartVersionOf('not json')).toBeNull()
  })
})

describe('labels', () => {
  it('turns item and order statuses into readable labels', () => {
    expect(itemStatusLabel('queued')).toBe('Esperando a la cocina')
    expect(itemStatusLabel('preparing')).toBe('En preparación')
    expect(itemStatusLabel('ready')).toBe('Listo, va en camino')
    expect(itemStatusLabel('delivered')).toBe('Entregado')
    expect(itemStatusLabel('cancelled')).toBe('Cancelado')
    expect(orderStatusLabel('partially_delivered')).toBe('Entregada en parte')
  })
})

describe('unavailableNames', () => {
  it('names each unavailable item once', () => {
    const lines = [
      { item_id: 'i1', name: 'Tacos' },
      { item_id: 'i1', name: 'Tacos' },
      { item_id: 'i2', name: 'Horchata' },
    ]
    expect(unavailableNames(lines, ['i1'])).toEqual(['Tacos'])
  })
})

describe('lineDraftKey', () => {
  it('is the same for the same add and different when anything changes', () => {
    expect(lineDraftKey('i1', 2, 'No onion ')).toBe(lineDraftKey('i1', 2, 'No onion'))
    expect(lineDraftKey('i1', 2, '')).not.toBe(lineDraftKey('i1', 3, ''))
  })
})

describe('reconnectDelay', () => {
  it('doubles from one second and stops at thirty', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(reconnectDelay)).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000])
  })
})

describe('createOrderSender', () => {
  function sender(...outcomes: (Order | Error)[]) {
    const ids = ['d1', 'd2', 'd3']
    const submit = vi.fn<(id: string, version: number) => Promise<Order>>(async () => {
      const outcome = outcomes.shift()
      if (outcome instanceof Error) throw outcome
      return outcome as Order
    })
    return { submit, orders: createOrderSender(submit, () => ids.shift() ?? 'none') }
  }
  const order = { id: 'o1', number: 4 } as Order

  it('reuses the id when the same reviewed version is retried, so a lost answer never duplicates the order', async () => {
    const { submit, orders } = sender(new Error('lost answer'), order)

    await expect(orders.send(3)).rejects.toThrow()
    await orders.send(3)

    expect(submit.mock.calls).toEqual([
      ['d1', 3],
      ['d1', 3],
    ])
  })

  it('gives a later round its own id after a lost answer, so it never replays the earlier order', async () => {
    const { submit, orders } = sender(new Error('lost answer'), order)

    await expect(orders.send(3)).rejects.toThrow()
    await orders.send(7)

    expect(submit.mock.calls).toEqual([
      ['d1', 3],
      ['d2', 7],
    ])
  })

  it('never reuses an id after a success', async () => {
    const { submit, orders } = sender(order, order)

    await orders.send(3)
    await orders.send(3)

    expect(submit.mock.calls.map(([id]) => id)).toEqual(['d1', 'd2'])
  })

  it('returns the order the server created', async () => {
    const { orders } = sender(order)

    await expect(orders.send(3)).resolves.toBe(order)
  })
})

describe('cartBarTotal', () => {
  it('shows the total of a loaded cart', () => {
    expect(cartBarTotal({ status: 'loaded', data: { total_cents: 1250 } })).toBe(formatMoney(1250))
  })

  it('shows a loaded empty cart as zero, because that total is known', () => {
    expect(cartBarTotal({ status: 'loaded', data: { total_cents: 0 } })).toBe(formatMoney(0))
  })

  it('has no amount while the cart loads', () => {
    expect(cartBarTotal({ status: 'loading' })).toBeNull()
  })

  it('says the total is unavailable when the cart failed to load', () => {
    expect(cartBarTotal({ status: 'error' })).toBe('No disponible')
  })
})

describe('rejectionNote', () => {
  it('shows why the kitchen rejected a dish', () => {
    expect(rejectionNote({ status: 'cancelled', cancel_reason: 'Out of avocado' })).toBe('Rechazado: Out of avocado')
  })

  it('says nothing for dishes that were not rejected or carry no reason', () => {
    expect(rejectionNote({ status: 'ready', cancel_reason: null })).toBeNull()
    expect(rejectionNote({ status: 'cancelled', cancel_reason: null })).toBe('Rechazado')
    expect(rejectionNote({ status: 'cancelled', cancel_reason: '  ' })).toBe('Rechazado')
  })
})

describe('hasSomethingToPay', () => {
  it('is false with no orders or with every dish cancelled', () => {
    expect(hasSomethingToPay([])).toBe(false)
    expect(hasSomethingToPay([{ total_cents: 0 }, { total_cents: 0 }])).toBe(false)
    expect(hasSomethingToPay([{ total_cents: 0 }, { total_cents: 1200 }])).toBe(true)
  })
})
