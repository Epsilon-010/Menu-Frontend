import { describe, expect, it } from 'vitest'
import { collectPages, MAX_PAGES, type Page } from './pagination.ts'

describe('collectPages', () => {
  it('follows next_cursor until the last page and keeps the order', async () => {
    const pages: Record<string, Page<number>> = {
      '?limit=100': { items: [1, 2], next_cursor: 'c 1/+' },
      '?limit=100&cursor=c%201%2F%2B': { items: [3], next_cursor: 'c2' },
      '?limit=100&cursor=c2': { items: [4], next_cursor: null },
    }
    const queries: string[] = []

    const items = await collectPages(async (query) => {
      queries.push(query)
      return pages[query]
    })

    expect(items).toEqual([1, 2, 3, 4])
    expect(queries).toEqual(Object.keys(pages))
  })

  it('stops after MAX_PAGES so a server that never ends cannot loop forever', async () => {
    let calls = 0

    const items = await collectPages(async () => {
      calls += 1
      return { items: [calls], next_cursor: 'again' }
    })

    expect(calls).toBe(MAX_PAGES)
    expect(items).toHaveLength(MAX_PAGES)
  })

  it('passes errors of a page through', async () => {
    await expect(
      collectPages(async () => {
        throw new Error('offline')
      }),
    ).rejects.toThrow('offline')
  })
})
