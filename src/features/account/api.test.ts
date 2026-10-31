import { afterEach, describe, expect, it, vi } from 'vitest'
import { changePassword, PasswordChangeError } from './api.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

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

function problem(status: number, detail: string): Response {
  return new Response(JSON.stringify({ type: 'about:blank', title: 'Problem', status, detail }), { status })
}

describe('changePassword', () => {
  it('posts the current and new password and returns the new session', async () => {
    const session = { expires_in: 900, role: 'admin', must_change_password: false }
    const calls = stubFetch(new Response(JSON.stringify(session), { status: 200 }))

    expect(await changePassword('TEMPPASS0001', 'my-own-pass')).toEqual(session)
    expect(calls[0].url).toBe('/api/v1/auth/password')
    expect(calls[0].init?.method).toBe('POST')
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      current_password: 'TEMPPASS0001',
      new_password: 'my-own-pass',
    })
  })

  it('shows the server message for a wrong current password or a rejected new one', async () => {
    stubFetch(
      problem(400, 'The current password is incorrect'),
      problem(422, 'The new password must be different from the current one'),
    )

    await expect(changePassword('guess', 'my-own-pass')).rejects.toThrow('The current password is incorrect.')
    await expect(changePassword('same-pass-1', 'same-pass-1')).rejects.toThrow(
      'The new password must be different from the current one.',
    )
  })

  it('asks to wait after too many attempts', async () => {
    stubFetch(problem(429, 'Too many login attempts. Try again later.'))

    const error = await changePassword('guess', 'my-own-pass').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(PasswordChangeError)
    expect((error as PasswordChangeError).status).toBe(429)
    expect((error as PasswordChangeError).message).toBe('Too many attempts. Wait a few minutes and try again.')
  })
})
