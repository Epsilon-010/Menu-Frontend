import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BUSINESS_NAME_MAX_LENGTH,
  businessNameError,
  credentialsError,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  register,
  RegisterError,
  signUpDraftKey,
} from './register.ts'

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

async function failureOf(promise: Promise<unknown>): Promise<RegisterError> {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  )
  expect(error).toBeInstanceOf(RegisterError)
  return error as RegisterError
}

const SIGN_UP = { id: 'b1', email: 'owner@example.com', password: 'long-enough', business_name: 'Taqueria 1' }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('register', () => {
  it('posts the client id, email, password and business name and returns the session', async () => {
    const calls = stubFetch(new Response(JSON.stringify({ expires_in: 900, role: 'admin' }), { status: 201 }))

    expect(await register(SIGN_UP)).toEqual({ expires_in: 900, role: 'admin' })

    expect(calls[0].url).toBe('/api/v1/auth/register')
    expect(calls[0].init?.method).toBe('POST')
    expect(JSON.parse(String(calls[0].init?.body))).toEqual(SIGN_UP)
  })

  it('points a taken email back to the email field', async () => {
    stubFetch(problem(409, 'Email already in use'))

    const failure = await failureOf(register(SIGN_UP))

    expect(failure.field).toBe('email')
    expect(failure.message).toBe('That email already has an account. Sign in, or use another email.')
  })

  it('asks for a fresh id when the id belongs to something else', async () => {
    stubFetch(problem(409, 'That id is already used by something else'))

    const failure = await failureOf(register(SIGN_UP))

    expect(failure.field).toBe('form')
    expect(failure.newIdNeeded).toBe(true)
    expect(failure.message).toBe('That id is already used by something else. Try again.')
  })

  it('shows the validation detail and asks to wait after too many attempts', async () => {
    stubFetch(problem(422, 'Invalid fields: email'), problem(429, 'Too many sign-up attempts'))

    expect((await failureOf(register(SIGN_UP))).message).toBe('Invalid fields: email.')
    expect((await failureOf(register(SIGN_UP))).message).toBe('Too many attempts. Wait a few minutes and try again.')
  })

  it('reports an unreachable server', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('offline')
      }),
    )

    expect((await failureOf(register(SIGN_UP))).message).toBe(
      'Could not reach the server. Check your connection and try again.',
    )
  })
})

describe('sign-up steps', () => {
  it('checks the email and the password length of step 1', () => {
    expect(credentialsError('owner@example.com', 'x'.repeat(PASSWORD_MIN_LENGTH))).toBeNull()
    expect(credentialsError('owner@example.com', 'x'.repeat(PASSWORD_MAX_LENGTH))).toBeNull()
    expect(credentialsError('  ', 'long-enough')).toEqual({ field: 'email', message: 'Enter your email.' })
    expect(credentialsError('owner', 'long-enough')).toEqual({ field: 'email', message: 'Enter a valid email.' })
    expect(credentialsError('owner@example.com', 'short')).toEqual({
      field: 'password',
      message: `Use ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters.`,
    })
    expect(credentialsError('owner@example.com', 'x'.repeat(PASSWORD_MAX_LENGTH + 1))?.field).toBe('password')
  })

  it('checks the business name of step 2', () => {
    expect(businessNameError(' Taqueria 1 ')).toBeNull()
    expect(businessNameError('   ')).toBe('Enter the name of your business.')
    expect(businessNameError('x'.repeat(BUSINESS_NAME_MAX_LENGTH + 1))).toBe(
      `Use at most ${BUSINESS_NAME_MAX_LENGTH} characters.`,
    )
  })

  it('keeps the same draft key only for the same email, password and business name', () => {
    expect(signUpDraftKey(' Owner@Example.com ', 'long-enough', ' Tacos ')).toBe(
      signUpDraftKey('owner@example.com', 'long-enough', 'Tacos'),
    )
    expect(signUpDraftKey('owner@example.com', 'long-enough', 'Tacos')).not.toBe(
      signUpDraftKey('owner@example.com', 'other-pass', 'Tacos'),
    )
    expect(signUpDraftKey('owner@example.com', 'long-enough', 'Tacos')).not.toBe(
      signUpDraftKey('owner@example.com', 'long-enough', 'Tacos Two'),
    )
  })
})
