/** One page of a cursor-paginated list: pass `next_cursor` back as `cursor`; null on the last page. */
export interface Page<T> {
  items: T[]
  next_cursor: string | null
}

export const PAGE_SIZE = 100
/** Guard against a server that keeps answering with a cursor: 50 pages of 100 rows. */
export const MAX_PAGES = 50

/**
 * Reads every page of a list, in order. `fetchPage` receives the query string to append to the path
 * (`?limit=100`, then `?limit=100&cursor=...`).
 */
export async function collectPages<T>(fetchPage: (query: string) => Promise<Page<T>>): Promise<T[]> {
  const items: T[] = []
  let cursor: string | null = null
  for (let read = 0; read < MAX_PAGES; read += 1) {
    const query: string = `?limit=${PAGE_SIZE}${cursor === null ? '' : `&cursor=${encodeURIComponent(cursor)}`}`
    const page = await fetchPage(query)
    items.push(...page.items)
    cursor = page.next_cursor
    if (cursor === null) break
  }
  return items
}
