import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DeliveryOrderCard } from '../deliveries/DeliveryOrderCard.tsx'
import type { StaffOrder, StaffOrderItem } from './api.ts'
import { KitchenOrderCard } from './KitchenOrderCard.tsx'

function dish(id: string, status: StaffOrderItem['status'], modifiers: StaffOrderItem['modifiers'] = []): StaffOrderItem {
  return {
    id,
    name: `Dish ${id}`,
    quantity: 1,
    note: '',
    added_by: 'Guest 1',
    status,
    cancel_reason: null,
    ready_at: null,
    updated_at: '2026-10-30T12:00:00Z',
    modifiers,
  }
}

const OPTIONS = [
  { group: 'Size', name: 'Large' },
  { group: 'Extras', name: 'Cheese' },
  { group: 'Extras', name: 'Avocado' },
]

function order(items: StaffOrderItem[]): StaffOrder {
  return {
    id: 'o1',
    number: 12,
    table_id: 't1',
    table_name: 'Table 1',
    sent_by: 'Guest 1',
    created_at: '2026-10-30T12:00:00Z',
    status: 'queued',
    items,
  }
}

const NOW = Date.parse('2026-10-30T12:05:00Z')

describe('the kitchen ticket', () => {
  it('lists the options of each dish by name, never a price', () => {
    const html = renderToStaticMarkup(
      <KitchenOrderCard order={order([dish('a', 'queued', OPTIONS)])} now={NOW} late={false} onAct={() => Promise.resolve(null)} />,
    )

    expect(html).toContain('Size: Large · Extras: Cheese, Avocado')
    expect(html).not.toContain('$')
  })

  it('keeps a dish without options as it was', () => {
    const html = renderToStaticMarkup(
      <KitchenOrderCard order={order([dish('a', 'queued')])} now={NOW} late={false} onAct={() => Promise.resolve(null)} />,
    )

    expect(html).toContain('Dish a')
    expect(html).not.toContain('Size:')
    expect(html).toContain('Start')
  })
})

describe('the delivery card', () => {
  it('lists the options of a ready dish by name only', () => {
    const html = renderToStaticMarkup(
      <DeliveryOrderCard
        order={order([dish('a', 'ready', OPTIONS), dish('b', 'queued')])}
        now={NOW}
        late={false}
        view="all"
        onDeliver={() => Promise.resolve(null)}
      />,
    )

    expect(html).toContain('Size: Large · Extras: Cheese, Avocado')
    expect(html).toContain('Dish b')
    expect(html).not.toContain('$')
  })
})
