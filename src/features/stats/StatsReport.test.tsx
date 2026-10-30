import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Duration, Statistics } from './api.ts'
import { COLLECTED_COLOR, PENDING_COLOR, SalesChart } from './SalesChart.tsx'
import { StatsReport } from './StatsReport.tsx'

const NONE: Duration = { average_seconds: null, median_seconds: null, count: 0 }

function statistics(overrides: Partial<Statistics> = {}): Statistics {
  return {
    from: '2026-10-20',
    to: '2026-10-21',
    timezone: 'America/Mexico_City',
    totals: { collected_cents: 15000, paid_bills: 2, average_ticket_cents: 7500, pending_cents: 4000, pending_orders: 1 },
    days: [
      { date: '2026-10-20', collected_cents: 15000, pending_cents: 0 },
      { date: '2026-10-21', collected_cents: 0, pending_cents: 4000 },
    ],
    payment_methods: [
      { method: 'cash', bills: 1, amount_cents: 10000 },
      { method: 'card', bills: 1, amount_cents: 5000 },
      { method: 'other', bills: 0, amount_cents: 0 },
    ],
    products: [{ item_id: 'i1', name: 'Pastor', quantity: 3, collected_cents: 6000, pending_cents: 3000 }],
    tables: [{ table_id: 't1', name: 'Mesa 1', orders: 2, collected_cents: 15000, pending_cents: 4000 }],
    times: {
      queue: { average_seconds: 360, median_seconds: 120, count: 3 },
      preparation: NONE,
      delivery: { average_seconds: 60, median_seconds: 45, count: 2 },
      order: { average_seconds: 750, median_seconds: 750, count: 1 },
      products: [{ item_id: 'i1', name: 'Pastor', queue: { average_seconds: 360, median_seconds: 120, count: 3 }, preparation: NONE, delivery: NONE }],
    },
    ...overrides,
  }
}

function text(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
}

describe('StatsReport', () => {
  it('shows collected and not-collected-yet apart, with the average ticket', () => {
    const page = text(renderToStaticMarkup(<StatsReport stats={statistics()} />))

    expect(page).toContain('Collected $150.00 2 paid bills')
    expect(page).toContain('Average ticket $75.00')
    expect(page).toContain('Ordered, not collected yet $40.00 1 order on open bills')
  })

  it('lists methods, tables and products with their amounts', () => {
    const page = text(renderToStaticMarkup(<StatsReport stats={statistics()} />))

    expect(page).toContain('Card 1 $50.00')
    expect(page).toContain('Mesa 1 2 $150.00 $40.00')
    expect(page).toContain('Pastor 3 $60.00 $30.00')
  })

  it('shows times as median with the average beside it, and a dash when nothing was measured', () => {
    const page = text(renderToStaticMarkup(<StatsReport stats={statistics()} />))

    expect(page).toContain('Waiting in the queue 2 min Median · average 6 min · 3 measured')
    expect(page).toContain('Preparation — Nothing measured yet')
    expect(page).toContain('Order total time 12 min 30 s')
    expect(page).toContain('Pastor 2 min / 6 min — —')
  })

  it('says so when a range has no sales instead of drawing empty tables', () => {
    const page = text(
      renderToStaticMarkup(<StatsReport stats={statistics({ products: [], tables: [] })} />),
    )

    expect(page).toContain('Nothing ordered in this range.')
    expect(page).toContain('No orders in this range.')
  })
})

describe('SalesChart', () => {
  it('draws one stacked bar per day with a legend for both series', () => {
    const html = renderToStaticMarkup(<SalesChart days={statistics().days} />)

    expect(html).toContain('Collected')
    expect(html).toContain('Ordered, not collected yet')
    expect(html.match(new RegExp(`fill="${COLLECTED_COLOR}"`, 'g'))).toHaveLength(1)
    expect(html.match(new RegExp(`fill="${PENDING_COLOR}"`, 'g'))).toHaveLength(1)
    expect(text(html)).toContain('Oct 20')
    expect(text(html)).toContain('Oct 21')
  })

  it('draws no bars for a range without sales', () => {
    const html = renderToStaticMarkup(
      <SalesChart days={[{ date: '2026-10-20', collected_cents: 0, pending_cents: 0 }]} />,
    )

    expect(html).not.toContain(`fill="${COLLECTED_COLOR}"`)
    expect(html).not.toContain(`fill="${PENDING_COLOR}"`)
  })
})
