import { describe, expect, it } from 'vitest'
import {
  addDays,
  chartModel,
  formatDuration,
  labelledDays,
  niceMax,
  presetRange,
  rangeError,
  shortDay,
  statsRequestKey,
  todayIn,
} from './logic.ts'

describe('todayIn', () => {
  it('is the date in the business time zone, not the browser one', () => {
    const lateEvening = new Date('2026-10-21T05:30:00Z') // 23:30 on the 20th in Mexico City

    expect(todayIn('America/Mexico_City', lateEvening)).toBe('2026-10-20')
    expect(todayIn('UTC', lateEvening)).toBe('2026-10-21')
  })
})

describe('presetRange', () => {
  it('covers today, the last 7 days or the last 30 days, today included', () => {
    expect(presetRange('today', '2026-10-30')).toEqual({ from: '2026-10-30', to: '2026-10-30' })
    expect(presetRange('7d', '2026-10-30')).toEqual({ from: '2026-10-24', to: '2026-10-30' })
    expect(presetRange('30d', '2026-03-01')).toEqual({ from: '2026-01-31', to: '2026-03-01' })
  })

  it('crosses months and leap days', () => {
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('rangeError', () => {
  it('accepts a valid range up to 366 days', () => {
    expect(rangeError({ from: '2026-01-01', to: '2027-01-01' })).toBeNull()
  })

  it('uses the same messages as the API', () => {
    expect(rangeError({ from: '2026-10-21', to: '2026-10-20' })).toBe('The end date must be on or after the start date.')
    expect(rangeError({ from: '2026-01-01', to: '2027-01-02' })).toBe('The range can be at most 366 days.')
    expect(rangeError({ from: '', to: '2026-10-20' })).toBe('Pick both dates.')
  })
})

describe('formatDuration', () => {
  it.each([
    [null, '—'],
    [0, '0 s'],
    [45, '45 s'],
    [60, '1 min'],
    [750, '12 min 30 s'],
    [3599, '59 min 59 s'],
    [3600, '1 h 00 min'],
    [3900, '1 h 05 min'],
    [93_000, '25 h 50 min'],
  ])('%s seconds read as %s', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text)
  })
})

describe('shortDay', () => {
  it('labels a day without shifting it by the browser time zone', () => {
    expect(shortDay('2026-10-01')).toBe('Oct 1')
  })
})

describe('niceMax', () => {
  it.each([
    [0, 1],
    [7, 10],
    [1500, 2000],
    [2100, 2500],
    [4000, 5000],
    [5001, 10_000],
  ])('%s rounds up to %s', (value, max) => {
    expect(niceMax(value)).toBe(max)
  })
})

describe('chartModel', () => {
  const days = [
    { date: '2026-10-20', collected_cents: 600, pending_cents: 400 },
    { date: '2026-10-21', collected_cents: 0, pending_cents: 0 },
  ]

  it('stacks pending above collected with a 2px gap, both from the baseline', () => {
    const model = chartModel(days, 200, 100)

    expect(model.max).toBe(1000)
    expect(model.ticks).toEqual([0, 250, 500, 750, 1000])
    const [first, empty] = model.bars
    expect(first.collected).toEqual({ y: 40, height: 60 })
    expect(first.pending).toEqual({ y: 0, height: 38 })
    expect(empty.collected.height).toBe(0)
    expect(empty.pending.height).toBe(0)
  })

  it('gives each day its own slot', () => {
    const [first, second] = chartModel(days, 200, 100).bars

    expect(second.x - first.x).toBe(100)
    expect(first.width).toBeLessThanOrEqual(32)
  })
})

describe('labelledDays', () => {
  it('labels every day of a short range', () => {
    expect([...labelledDays(7)]).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('thins out a long range but keeps the first and last day', () => {
    const shown = labelledDays(30)

    expect(shown.size).toBeLessThanOrEqual(9)
    expect(shown.has(0) && shown.has(29)).toBe(true)
  })
})

describe('statsRequestKey', () => {
  const range = { from: '2026-10-01', to: '2026-10-07' }

  it('changes with the time zone, so a saved zone reloads the same dates', () => {
    expect(statsRequestKey('America/Mexico_City', range, 0)).not.toBe(statsRequestKey('UTC', range, 0))
  })

  it('changes with a retry and is null until the zone and the range are known', () => {
    expect(statsRequestKey('UTC', range, 0)).not.toBe(statsRequestKey('UTC', range, 1))
    expect(statsRequestKey(null, range, 0)).toBeNull()
    expect(statsRequestKey('UTC', null, 0)).toBeNull()
  })
})
