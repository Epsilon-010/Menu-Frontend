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
    expect(html).toContain('Seleccionar todo')
    // The actions only appear once a dish is chosen.
    expect(html).not.toContain('Empezar')
  })

  it('names the state of each dish in words and says when the ticket is late', () => {
    const html = renderToStaticMarkup(
      <KitchenOrderCard
        order={order([dish('a', 'queued'), dish('b', 'preparing')])}
        now={NOW}
        late
        onAct={() => Promise.resolve(null)}
      />,
    )

    expect(html).toContain('En cola')
    expect(html).toContain('En preparación')
    expect(html).toContain('Retrasada')
    expect(html).toContain('type="checkbox"')
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

  it('puts the ready dishes in their own group with a deliver button each', () => {
    const html = renderToStaticMarkup(
      <DeliveryOrderCard
        order={order([dish('a', 'ready'), dish('b', 'ready'), dish('c', 'queued')])}
        now={NOW}
        late={false}
        view="all"
        onDeliver={() => Promise.resolve(null)}
      />,
    )

    expect(html).toContain('Listos para llevar (2)')
    expect(html.match(/>Entregar</g)).toHaveLength(2)
    expect(html).toContain('Entregar todos los listos (2)')
    expect(html).toContain('En cola')
  })
})
