/** Fetch stubs shared by the staff API tests. */
import { vi } from 'vitest'

export function ok(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

export function problem(status: number, detail?: string): Response {
  return new Response(JSON.stringify({ type: 'about:blank', title: 'Problem', status, ...(detail ? { detail } : {}) }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

export function stubFetch(...responses: (Response | Error)[]) {
  const calls: { url: string; init?: RequestInit }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      const next = responses.shift()
      if (!next) throw new Error(`Unexpected request to ${url}`)
      if (next instanceof Error) throw next
      return next
    }),
  )
  return calls
}

export async function failure(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (caught: unknown) => caught,
  )
}
