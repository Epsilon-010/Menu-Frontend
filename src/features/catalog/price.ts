/** Prices travel as integer cents; the admin types them as "25" or "25.50". Never parsed as float. */

const PRICE_PATTERN = /^(\d{1,6})(?:[.,](\d{1,2}))?$/

/** Same cap as the API (catalog domain MAX_PRICE_CENTS): 100000.00. */
export const MAX_PRICE_CENTS = 10_000_000

/** Cents for a typed price, or null if it is not a valid amount. */
export function parsePrice(text: string): number | null {
  const match = PRICE_PATTERN.exec(text.trim())
  if (!match) return null
  const whole = Number(match[1])
  const fraction = Number((match[2] ?? '').padEnd(2, '0'))
  const cents = whole * 100 + fraction
  return cents <= MAX_PRICE_CENTS ? cents : null
}

export function formatPrice(cents: number): string {
  const whole = Math.floor(cents / 100)
  const fraction = String(cents % 100).padStart(2, '0')
  return `${whole}.${fraction}`
}
