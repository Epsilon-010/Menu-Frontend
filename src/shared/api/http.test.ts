import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, REQUEST_TIMEOUT_MS } from './http.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  // Each test loads a fresh module: no refresh in flight or listener leaks into the next one.
  vi.resetModules()
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

/** A fetch stub: 401 for the first call of each request path, then `refresh` decides how /auth/refresh answers. */
function stubServer(refresh: () => Promise<Response>) {
  const calls: string[] = []
  const seen = new Set<string>()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      calls.push(url)
      if (url.endsWith('/auth/refresh')) return refresh()
      if (seen.has(url)) return new Response('{}', { status: 200 })
      seen.add(url)
      return new Response('{}', { status: 401 })
    }),
  )
  return calls
}

const SESSION = JSON.stringify({ expires_in: 900, role: 'waiter' })

describe('apiFetch when the session needs a refresh', () => {
  it('refreshes once and retries the request', async () => {
    const calls = stubServer(async () => new Response(SESSION, { status: 200 }))
    const { apiFetch: fetchWithSession } = await import('./http.ts')

    const response = await fetchWithSession('/orders')

    expect(response.status).toBe(200)
    expect(calls).toEqual(['/api/v1/orders', '/api/v1/auth/refresh', '/api/v1/orders'])
  })

  it('ends the session only when the server refuses the refresh', async () => {
    stubServer(async () => new Response('{}', { status: 401 }))
    const { apiFetch: fetchWithSession, onSessionEnded } = await import('./http.ts')
    const ended = vi.fn()
    const stop = onSessionEnded(ended)

    const response = await fetchWithSession('/bills/tables')

    expect(response.status).toBe(401)
    expect(ended).toHaveBeenCalledTimes(1)
    stop()
  })

  it.each([
    ['the server is unavailable', async () => new Response('{}', { status: 503 })],
    ['the network fails', async () => Promise.reject(new TypeError('Failed to fetch'))],
  ])('keeps the session when %s, and the request fails so it can be retried', async (_case, refresh) => {
    stubServer(refresh)
    const { apiFetch: fetchWithSession, onSessionEnded, SessionUnavailableError } = await import('./http.ts')
    const ended = vi.fn()
    const stop = onSessionEnded(ended)

    await expect(fetchWithSession('/kitchen/orders')).rejects.toBeInstanceOf(SessionUnavailableError)
    expect(ended).not.toHaveBeenCalled()
    stop()
  })

  it('gives the refresh a deadline, so a hung refresh cannot freeze every request', async () => {
    const deadlines: AbortController[] = []
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => {
      const controller = new AbortController()
      deadlines.push(controller)
      return controller.signal
    })
    let refreshSignal: AbortSignal | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        if (!url.endsWith('/auth/refresh')) return Promise.resolve(new Response('{}', { status: 401 }))
        refreshSignal = init?.signal ?? undefined
        return new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Timed out', 'TimeoutError')))
        })
      }),
    )
    const { apiFetch: fetchWithSession, onSessionEnded, SessionUnavailableError } = await import('./http.ts')
    const ended = vi.fn()
    const stop = onSessionEnded(ended)

    const pending = fetchWithSession('/deliveries')
    await vi.waitFor(() => expect(refreshSignal).toBeInstanceOf(AbortSignal))
    for (const controller of deadlines) controller.abort()

    await expect(pending).rejects.toBeInstanceOf(SessionUnavailableError)
    expect(ended).not.toHaveBeenCalled()
    stop()
    timeout.mockRestore()
  })

  it('two tabs refreshing at once take turns, so the server never sees the same token twice', async () => {
    // One lock manager shared by every "tab" of the browser, like navigator.locks.
    let queue = Promise.resolve()
    const locks = {
      request: vi.fn((_name: string, task: () => Promise<unknown>) => {
        const run = queue.then(task)
        queue = run.then(
          () => undefined,
          () => undefined,
        )
        return run
      }),
    }
    vi.stubGlobal('navigator', { locks })
    let inFlight = 0
    let overlapped = false
    stubServer(async () => {
      inFlight += 1
      if (inFlight > 1) overlapped = true
      await new Promise((resolve) => setTimeout(resolve, 5))
      inFlight -= 1
      return new Response(SESSION, { status: 200 })
    })
    // Each tab loads its own copy of the module.
    const firstTab = await import('./http.ts')
    vi.resetModules()
    const secondTab = await import('./http.ts')

    const [first, second] = await Promise.all([firstTab.apiFetch('/tables'), secondTab.apiFetch('/staff')])

    expect([first.status, second.status]).toEqual([200, 200])
    expect(overlapped).toBe(false)
    expect(locks.request).toHaveBeenCalledTimes(2)
    expect(locks.request.mock.calls[0][0]).toBe(locks.request.mock.calls[1][0])
  })
})
