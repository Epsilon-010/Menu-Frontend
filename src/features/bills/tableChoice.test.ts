import { describe, expect, it } from 'vitest'
import type { TableOverview } from './api.ts'
import { latestTableChoice, nextTableChoice, shownOpenTable } from './logic.ts'

function openTable(id: string): TableOverview {
  return {
    table_id: id,
    table_name: `Table ${id}`,
    bill: {
      id: `bill-${id}`,
      table_id: id,
      table_name: `Table ${id}`,
      opened_at: '2026-11-11T18:00:00Z',
      closed_at: null,
      payment_method: null,
      bill_requested_at: null,
      orders: [],
      total_cents: 0,
    },
  }
}

describe('nextTableChoice', () => {
  it('grows with every call, so a later choice always has a higher turn', () => {
    const first = nextTableChoice()
    const second = nextTableChoice()
    expect(second).toBeGreaterThan(first)
  })
})

describe('latestTableChoice', () => {
  it('has no table before anything is chosen', () => {
    expect(latestTableChoice(null, null)).toBeNull()
  })

  it('takes the only choice there is', () => {
    expect(latestTableChoice({ tableId: 'a', at: 1 }, null)).toBe('a')
    expect(latestTableChoice(null, { tableId: 'b', at: 1 })).toBe('b')
  })

  it('takes the click on the list when it came after the banner', () => {
    expect(latestTableChoice({ tableId: 'a', at: 1 }, { tableId: 'b', at: 2 })).toBe('b')
  })

  it('takes the banner on a tie', () => {
    expect(latestTableChoice({ tableId: 'a', at: 2 }, { tableId: 'b', at: 2 })).toBe('a')
  })

  it('takes the banner when it came after the click on the list', () => {
    expect(latestTableChoice({ tableId: 'a', at: 3 }, { tableId: 'b', at: 2 })).toBe('a')
  })
})

describe('shownOpenTable', () => {
  const open = [openTable('a'), openTable('b')]

  it('shows the chosen table while it is open', () => {
    expect(shownOpenTable(open, 'b')?.table_id).toBe('b')
  })

  it('falls back to the first open table when nothing is chosen or the chosen one closed', () => {
    expect(shownOpenTable(open, null)?.table_id).toBe('a')
    expect(shownOpenTable(open, 'gone')?.table_id).toBe('a')
  })

  it('shows nothing when no table is open', () => {
    expect(shownOpenTable([], 'a')).toBeNull()
  })
})

describe('shownOpenTable, with a table already on screen', () => {
  const a = openTable('a')
  const b = openTable('b')

  it('keeps the table on screen when the list reorders and nothing was chosen', () => {
    expect(shownOpenTable([b, a], null, 'a')).toBe(a)
  })

  it('still follows a choice over the table on screen', () => {
    expect(shownOpenTable([a, b], 'b', 'a')).toBe(b)
  })

  it('goes back to the first open table once the one on screen closed', () => {
    expect(shownOpenTable([b], null, 'a')).toBe(b)
    expect(shownOpenTable([b], 'a', 'a')).toBe(b)
  })

  it('shows the first open table when nothing was on screen yet', () => {
    expect(shownOpenTable([a, b], null, null)).toBe(a)
    expect(shownOpenTable([], null, 'a')).toBeNull()
  })
})
