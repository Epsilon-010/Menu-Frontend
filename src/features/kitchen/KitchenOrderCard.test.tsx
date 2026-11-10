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
    // A queued dish carries its own next steps; nothing has to be selected first.
    expect(html).toContain('Empezar')
    expect(html).toContain('Listo')
    expect(html).toContain('aria-label="Rechazar Dish a"')
    expect(html).not.toContain('type="checkbox"')
  })

  it('offers a started dish only its next step, and the whole ticket at once when several are pending', () => {
    const html = renderToStaticMarkup(
      <KitchenOrderCard
        order={order([dish('a', 'queued'), dish('b', 'queued'), dish('c', 'preparing')])}
        now={NOW}
        late={false}
        onAct={() => Promise.resolve(null)}
      />,
    )

    // Only dishes nobody started can be rejected.
    expect(html.match(/aria-label="Rechazar /g)).toHaveLength(2)
    expect(html).toContain('Empezar todo (2)')
    expect(html).toContain('Todo listo (3)')
  })

  it('keeps the dishes that already went out apart, without actions', () => {
    const cancelled = { ...dish('b', 'cancelled'), cancel_reason: 'Out of avocado', cancelled_by: 'waiter' as const }
    const html = renderToStaticMarkup(
      <KitchenOrderCard
        order={order([dish('a', 'queued'), dish('r', 'ready'), cancelled])}
        now={NOW}
        late={false}
        onAct={() => Promise.resolve(null)}
      />,
    )

    expect(html).toContain('Ya salieron (2)')
    expect(html).toContain('Cancelado: Out of avocado')
    expect(html).not.toContain('Rechazado')
    expect(html).not.toContain('Todo listo')
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
