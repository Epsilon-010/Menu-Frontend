import { afterEach, describe, expect, it, vi } from 'vitest'
import { accountRole, homePathFor, qrLogin, QrJoinError, type Account } from './api.ts'

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

describe('qrLogin', () => {
  it('joins with the token and the trimmed name, and leaves out an empty name', async () => {
    const calls = stubFetch(
      new Response(JSON.stringify({ expires_in: 900, role: 'guest' }), { status: 200 }),
      new Response(JSON.stringify({ expires_in: 900, role: 'guest' }), { status: 200 }),
    )

    expect(await qrLogin('tok', '  Ana ')).toEqual({ expires_in: 900, role: 'guest' })
    await qrLogin('tok', '   ')

    expect(calls[0].url).toBe('/api/v1/auth/qr')
    expect(calls[0].init?.method).toBe('POST')
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ token: 'tok', name: 'Ana' })
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({ token: 'tok' })
  })

  it('shows the server message when the table is not open or the QR is not valid', async () => {
    stubFetch(problem(409, 'This table is not open yet; ask your waiter'), problem(401, 'This QR code is not valid'))

    expect((await failureOf(qrLogin('tok'))).message).toBe('This table is not open yet; ask your waiter.')
    expect((await failureOf(qrLogin('tok'))).message).toBe('This QR code is not valid.')
  })

  it('asks to wait after too many attempts', async () => {
    stubFetch(problem(429, 'Too many login attempts'))

    const failure = await failureOf(qrLogin('tok'))

    expect(failure.status).toBe(429)
    expect(failure.message).toBe('Too many attempts. Wait a few minutes and try again.')
  })
})

describe('accountRole', () => {
  const tenant = { id: 'x', name: 'La Taqueria' }
  const table = { id: 't1', name: 'Mesa 4' }

  it('tells a guest from the table tablet and sends both to the menu', () => {
    const guest: Account = { user: null, table, guest: { id: 'g1', name: 'Ana' }, tenant }
    const tablet: Account = { user: null, table, guest: null, tenant }

    expect(accountRole(guest)).toBe('guest')
    expect(accountRole(tablet)).toBe('table')
    expect(homePathFor('guest')).toBe('/menu')
    expect(homePathFor('table')).toBe('/menu')
  })
})
