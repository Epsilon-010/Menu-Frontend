import { MAX_LATE_ORDER_MINUTES, MIN_LATE_ORDER_MINUTES } from './api.ts'

export type ParsedMinutes = { ok: true; value: number } | { ok: false; message: string }

/** Reads the late order threshold typed by the admin. */
export function parseLateMinutes(input: string): ParsedMinutes {
  const text = input.trim()
  const value = Number(text)
  if (!/^\d+$/.test(text) || value < MIN_LATE_ORDER_MINUTES || value > MAX_LATE_ORDER_MINUTES) {
    return {
      ok: false,
      message: `Use a whole number of minutes from ${MIN_LATE_ORDER_MINUTES} to ${MAX_LATE_ORDER_MINUTES}.`,
    }
  }
  return { ok: true, value }
}
