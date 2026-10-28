import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStaffMember, StaffError } from './api.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubFetch(response: Response) {
  const calls: RequestInit[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init) calls.push(init)
      return response
    }),
  )
  return calls
}

const member = { id: 'm1', username: 'juan.taco', full_name: 'Juan', role: 'waiter' as const, password: 's3cret-pass' }

describe('staff API', () => {
  it('sends the client id, so repeating the create returns the same member', async () => {
    const calls = stubFetch(new Response(JSON.stringify({ id: 'm1' }), { status: 201 }))

    await createStaffMember(member)

    expect(JSON.parse(String(calls[0].body))).toMatchObject({ id: 'm1', username: 'juan.taco' })
  })

  it('shows the server detail of a conflict', async () => {
    stubFetch(
      new Response(JSON.stringify({ status: 409, detail: 'That id is already used by something else' }), { status: 409 }),
    )

    const error = await createStaffMember(member).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(StaffError)
    expect((error as StaffError).message).toBe('That id is already used by something else.')
  })
})
