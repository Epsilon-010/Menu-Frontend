import { describe, expect, it, vi } from 'vitest'
import type { Order } from './api.ts'
import {
  cartVersionOf,
  createOrderSender,
  groupByPerson,
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
    expect(itemStatusLabel('queued')).toBe('Waiting for the kitchen')
    expect(itemStatusLabel('preparing')).toBe('Being prepared')
    expect(itemStatusLabel('ready')).toBe('Ready, on its way')
    expect(itemStatusLabel('delivered')).toBe('Delivered')
    expect(itemStatusLabel('cancelled')).toBe('Cancelled')
    expect(orderStatusLabel('partially_delivered')).toBe('Partly delivered')
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
  it('keeps the draft id after a failure and uses a new one after a success', async () => {
    const ids = ['d1', 'd2']
    const submit = vi
      .fn<(id: string, version: number) => Promise<Order>>()
      .mockRejectedValueOnce(new Error('The order changed, review it'))
      .mockResolvedValueOnce({ id: 'd1', number: 4 } as Order)
    const sender = createOrderSender(submit, () => ids.shift() ?? 'none')

    await expect(sender.send(3)).rejects.toThrow()
    expect(sender.draftId).toBe('d1')

    await sender.send(5)
    expect(submit.mock.calls).toEqual([
      ['d1', 3],
      ['d1', 5],
    ])
    expect(sender.draftId).toBe('d2')
  })
})

describe('rejectionNote', () => {
  it('shows why the kitchen rejected a dish', () => {
    expect(rejectionNote({ status: 'cancelled', cancel_reason: 'Out of avocado' })).toBe('Rejected: Out of avocado')
  })

  it('says nothing for dishes that were not rejected or carry no reason', () => {
    expect(rejectionNote({ status: 'ready', cancel_reason: null })).toBeNull()
    expect(rejectionNote({ status: 'cancelled', cancel_reason: null })).toBe('Rejected')
    expect(rejectionNote({ status: 'cancelled', cancel_reason: '  ' })).toBe('Rejected')
  })
})
