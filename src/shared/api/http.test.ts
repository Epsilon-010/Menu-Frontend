import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, REQUEST_TIMEOUT_MS } from './http.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiFetch', () => {
  it('gives every request a deadline, so a hung connection cannot block the panel forever', async () => {
    const seen: (AbortSignal | null | undefined)[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        seen.push(init?.signal)
        return new Response('{}', { status: 200 })
      }),
    )

    await apiFetch('/catalog/categories')

    expect(seen[0]).toBeInstanceOf(AbortSignal)
    expect(REQUEST_TIMEOUT_MS).toBe(15_000)
  })

  it('aborts a request that never answers once its deadline passes', async () => {
    // AbortSignal.timeout runs on the browser's own clock: replace it to fire the deadline by hand.
    const deadlines: { ms: number; controller: AbortController }[] = []
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms: number) => {
      const controller = new AbortController()
      deadlines.push({ ms, controller })
      return controller.signal
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('Timed out', 'TimeoutError')))
          }),
      ),
    )

    const pending = apiFetch('/catalog/categories')
    deadlines[0].controller.abort()

    await expect(pending).rejects.toThrow('Timed out')
    expect(deadlines[0].ms).toBe(REQUEST_TIMEOUT_MS)
    timeout.mockRestore()
  })
})

describe('apiFetch without AbortSignal.any (older tablet browsers)', () => {
  it('still applies the deadline when the caller passes its own signal', async () => {
    const original = AbortSignal.any
    // @ts-expect-error simulating a browser that lacks the API
    delete AbortSignal.any
    const seen: AbortSignal[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.signal) seen.push(init.signal)
        return new Response('{}', { status: 200 })
      }),
    )

    await apiFetch('/catalog/categories', { signal: new AbortController().signal })

    expect(seen).toHaveLength(1)
    AbortSignal.any = original
  })
})
