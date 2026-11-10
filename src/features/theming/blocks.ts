/**
 * Ordered lists of theme blocks (card parts, menu header parts): always a permutation of every block, so the
 * menu never loses or repeats a part.
 */

/** The list as the theme stores it, or the default order when it is not exactly one of each block. */
export function permutationOr<T extends string>(raw: unknown, defaults: readonly T[]): T[] {
  if (!Array.isArray(raw) || raw.length !== defaults.length) return [...defaults]
  const seen = new Set<unknown>(raw)
  const complete = seen.size === defaults.length && defaults.every((block) => seen.has(block))
  return complete ? (raw as T[]) : [...defaults]
}

/** The list with the block at `from` moved to `to`; out-of-range positions leave it unchanged. */
export function moveBlock<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return [...list]
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}
