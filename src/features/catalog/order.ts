/**
 * The ids with `id` swapped with its neighbour (`delta` -1 moves it up, +1 down).
 *
 * It works on ids, not indexes, so it can run against the latest catalog when a queued move
 * finally executes; an unknown id or a move past an edge returns the order unchanged.
 */
export function movedById(ids: string[], id: string, delta: -1 | 1): string[] {
  const index = ids.indexOf(id)
  const target = index + delta
  if (index < 0 || target < 0 || target >= ids.length) return ids
  const next = [...ids]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
