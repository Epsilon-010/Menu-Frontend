export const INPUT =
  'w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none'
export const BUTTON =
  'rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50'
export const PRIMARY_BUTTON =
  'rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50'
export const DANGER_BUTTON =
  'rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50'

/** The ids in their current order with the one at `index` moved by `delta` (-1 up, +1 down). */
export function moved(ids: string[], index: number, delta: -1 | 1): string[] {
  const target = index + delta
  if (target < 0 || target >= ids.length) return ids
  const next = [...ids]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
