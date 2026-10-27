/** The ids in their current order with the one at `index` moved by `delta` (-1 up, +1 down). */
export function moved(ids: string[], index: number, delta: -1 | 1): string[] {
  const target = index + delta
  if (target < 0 || target >= ids.length) return ids
  const next = [...ids]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
