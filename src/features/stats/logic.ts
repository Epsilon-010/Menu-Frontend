/** Pure helpers of the statistics page: date ranges, durations and the sales chart geometry. */

export type RangePreset = 'today' | '7d' | '30d' | 'custom'

export interface DateRange {
  /** Calendar days (YYYY-MM-DD) in the business's time zone, both included. */
  from: string
  to: string
}

/** Same limit as the API. */
export const MAX_RANGE_DAYS = 366

/** Today's date (YYYY-MM-DD) in a time zone; `en-CA` formats dates as ISO. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** The browser's time zone, sent when a business signs up. */
export function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
  } catch {
    return undefined
  }
}

/** A date `days` before or after `day` (calendar arithmetic, no time zone involved). */
export function addDays(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number)
  const moved = new Date(Date.UTC(year, month - 1, date + days))
  return moved.toISOString().slice(0, 10)
}

/** "7 days" is today and the 6 days before it. */
export function presetRange(preset: Exclude<RangePreset, 'custom'>, today: string): DateRange {
  const span = preset === 'today' ? 1 : preset === '7d' ? 7 : 30
  return { from: addDays(today, 1 - span), to: today }
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/** A message for an invalid custom range, or null. Mirrors the API's own checks. */
export function rangeError(range: DateRange): string | null {
  if (!ISO_DAY.test(range.from) || !ISO_DAY.test(range.to)) return 'Pick both dates.'
  if (range.to < range.from) return 'The end date must be on or after the start date.'
  const days = (Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / 86_400_000 + 1
  if (days > MAX_RANGE_DAYS) return `The range can be at most ${MAX_RANGE_DAYS} days.`
  return null
}

/**
 * Identifies one statistics request; null while the zone or the range is unknown. The zone is part of it:
 * the same dates cut in another zone are other figures, so saving a new zone loads them again.
 */
export function statsRequestKey(zone: string | null, range: DateRange | null, attempt: number): string | null {
  if (zone === null || range === null) return null
  return `${zone}|${range.from}|${range.to}|${attempt}`
}

/** "45 s", "12 min 30 s", "12 min", "1 h 05 min"; an em dash when nothing was measured. */
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  const total = Math.max(0, Math.round(seconds))
  if (total < 60) return `${total} s`
  if (total < 3600) {
    const minutes = Math.floor(total / 60)
    const rest = total % 60
    return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`
  }
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}

/** Short day label for the chart axis ("Oct 20"). */
export function shortDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, date)),
  )
}

/** A round axis maximum at or above `value` (1, 2, 2.5 or 5 times a power of ten). */
export function niceMax(value: number): number {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * power >= value) return step * power
  }
  return 10 * power
}

export interface DayValue {
  date: string
  collected_cents: number
  pending_cents: number
}

export interface ChartBar {
  date: string
  x: number
  width: number
  /** Collected sits on the baseline; pending is stacked above it, 2px apart. */
  collected: { y: number; height: number }
  pending: { y: number; height: number }
}

export interface ChartModel {
  max: number
  ticks: number[]
  bars: ChartBar[]
}

const STACK_GAP = 2

/** Bars of a stacked daily chart drawn in a `width` x `height` plot area (origin top-left). */
export function chartModel(days: DayValue[], width: number, height: number): ChartModel {
  const max = niceMax(Math.max(0, ...days.map((day) => day.collected_cents + day.pending_cents)))
  const slot = days.length > 0 ? width / days.length : width
  const barWidth = Math.max(1, Math.min(32, slot * 0.7))
  const scale = (cents: number) => (cents / max) * height
  const bars = days.map((day, index) => {
    const collectedHeight = scale(day.collected_cents)
    const pendingRaw = scale(day.pending_cents)
    // The gap only exists between two visible segments.
    const gap = collectedHeight > 0 && pendingRaw > 0 ? Math.min(STACK_GAP, pendingRaw / 2) : 0
    const pendingHeight = Math.max(0, pendingRaw - gap)
    return {
      date: day.date,
      x: index * slot + (slot - barWidth) / 2,
      width: barWidth,
      collected: { y: height - collectedHeight, height: collectedHeight },
      pending: { y: height - collectedHeight - gap - pendingHeight, height: pendingHeight },
    }
  })
  return { max, ticks: [0, 0.25, 0.5, 0.75, 1].map((share) => share * max), bars }
}

/** Which axis labels to show so they never crowd: at most `limit`, always the first and the last. */
export function labelledDays(count: number, limit = 8): Set<number> {
  if (count <= limit) return new Set(Array.from({ length: count }, (_, index) => index))
  const step = Math.ceil((count - 1) / (limit - 1))
  const shown = new Set<number>()
  for (let index = 0; index < count; index += step) shown.add(index)
  shown.add(count - 1)
  return shown
}
