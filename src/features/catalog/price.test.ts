import { describe, expect, it } from 'vitest'
import { formatPrice, MAX_PRICE_CENTS, parsePrice } from './price.ts'

describe('parsePrice', () => {
  it.each([
    ['25', 2500],
    ['25.5', 2550],
    ['25.50', 2550],
    ['25,50', 2550],
    ['0', 0],
    ['  7.05 ', 705],
    ['100000', MAX_PRICE_CENTS],
    ['100000.00', MAX_PRICE_CENTS],
  ])('reads %j as %i cents without floating point', (text, cents) => {
    expect(parsePrice(text)).toBe(cents)
  })

  it.each(['', '25.', '.5', '25.505', '-1', 'abc', '1e3', '25 50', '100000.01', '999999'])(
    'rejects %j',
    (text) => {
      expect(parsePrice(text)).toBeNull()
    },
  )

  it('keeps cents exact where float math would drift', () => {
    // 0.1 + 0.2 style errors: 1.15 * 100 is 114.99999999999999 in floating point.
    expect(parsePrice('1.15')).toBe(115)
    expect(parsePrice('19.99')).toBe(1999)
  })
})

describe('formatPrice', () => {
  it.each([
    [0, '0.00'],
    [5, '0.05'],
    [2550, '25.50'],
    [MAX_PRICE_CENTS, '100000.00'],
  ])('shows %i cents as %s', (cents, text) => {
    expect(formatPrice(cents)).toBe(text)
  })

  it('round trips with parsePrice', () => {
    for (const cents of [0, 1, 99, 100, 1234, MAX_PRICE_CENTS]) {
      expect(parsePrice(formatPrice(cents))).toBe(cents)
    }
  })
})
