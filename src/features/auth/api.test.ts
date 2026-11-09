import { afterEach, describe, expect, it, vi } from 'vitest'
import { accountRole, fetchAccount, homePathFor, qrLogin, QrJoinError, type Account } from './api.ts'
import { joinedWithQr } from './guestMarker.ts'

function problem(status: number, detail: string): Response {
  return new Response(JSON.stringify({ type: 'about:blank', title: 'Problem', status, detail }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

function stubFetch(...responses: Response[]) {
  const calls: { url: string; init?: RequestInit }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      const next = responses.shift()
      if (!next) throw new Error(`Unexpected request to ${url}`)
      return next
    }),
  )
  return calls
}

async function failureOf(promise: Promise<unknown>): Promise<QrJoinError> {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  )
  expect(error).toBeInstanceOf(QrJoinError)
  return error as QrJoinError
}

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubStorage() {
  const entries = new Map<string, string>()
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => entries.set(key, value),
      removeItem: (key: string) => entries.delete(key),
    },
  })
}

describe('fetchAccount', () => {
  const account = { user: null, table: { id: 't1', name: 'Mesa 1' }, guest: null, tenant: { id: 'b1', name: 'Demo' } }

  it('returns the account of a live session', async () => {
    stubFetch(new Response(JSON.stringify(account), { status: 200 }))

    await expect(fetchAccount()).resolves.toEqual(account)
  })

  it('answers null only when the server confirms there is no session', async () => {
    stubFetch(problem(401, 'Not authenticated'), problem(401, 'Refresh refused'))

    await expect(fetchAccount()).resolves.toBeNull()
  })

  it('fails on a server error instead of reading it as signed out', async () => {
    stubFetch(problem(500, 'boom'))

    await expect(fetchAccount()).rejects.toThrow()
  })

  it('fails when the server never answers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')))

    await expect(fetchAccount()).rejects.toThrow()
  })
})

describe('qrLogin', () => {
  it('remembers the QR the guest joined with', async () => {
    stubStorage()
    stubFetch(new Response(JSON.stringify({ expires_in: 900, role: 'guest' }), { status: 200 }))

    await qrLogin('qr-a')

    expect(joinedWithQr('qr-a')).toBe(true)
    expect(joinedWithQr('qr-b')).toBe(false)
  })

  it('keeps the current table when joining another one fails', async () => {
    stubStorage()
    stubFetch(
      new Response(JSON.stringify({ expires_in: 900, role: 'guest' }), { status: 200 }),
      problem(409, 'This visit is full'),
    )

    await qrLogin('qr-a')
    await qrLogin('qr-b').catch(() => null)

    expect(joinedWithQr('qr-a')).toBe(true)
  })

  it('joins with the token and the trimmed name, and leaves out an empty name', async () => {
    const calls = stubFetch(
      new Response(JSON.stringify({ expires_in: 900, role: 'guest' }), { status: 200 }),
      new Response(JSON.stringify({ expires_in: 900, role: 'guest' }), { status: 200 }),
    )

    expect(await qrLogin('tok', '  Guest 1 ')).toEqual({ expires_in: 900, role: 'guest' })
    await qrLogin('tok', '   ')

    expect(calls[0].url).toBe('/api/v1/auth/qr')
    expect(calls[0].init?.method).toBe('POST')
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ token: 'tok', name: 'Guest 1' })
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({ token: 'tok' })
  })

  it('shows the server message when the table is full or the QR is not valid', async () => {
    stubFetch(
      problem(409, 'This table already has the most guests it allows; ask your waiter'),
      problem(401, 'This QR code is not valid'),
    )

    expect((await failureOf(qrLogin('tok'))).message).toBe(
      'This table already has the most guests it allows; ask your waiter.',
    )
    expect((await failureOf(qrLogin('tok'))).message).toBe('This QR code is not valid.')
  })

  it('asks to wait after too many attempts', async () => {
    stubFetch(problem(429, 'Too many login attempts'))

    const failure = await failureOf(qrLogin('tok'))

    expect(failure.status).toBe(429)
    expect(failure.message).toBe('Demasiados intentos. Espera unos minutos e inténtalo de nuevo.')
  })
})

describe('accountRole', () => {
  const tenant = { id: 'x', name: 'La Taqueria' }
  const table = { id: 't1', name: 'Mesa 4' }

  it('tells a guest from the table tablet and sends both to the menu', () => {
    const guest: Account = { user: null, table, guest: { id: 'g1', name: 'Guest 1' }, tenant }
    const tablet: Account = { user: null, table, guest: null, tenant }

    expect(accountRole(guest)).toBe('guest')
    expect(accountRole(tablet)).toBe('table')
    expect(homePathFor('guest')).toBe('/menu')
    expect(homePathFor('table')).toBe('/menu')
  })
})
