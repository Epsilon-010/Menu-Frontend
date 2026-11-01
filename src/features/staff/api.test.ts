import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStaffMember, listStaff, regenerateStaffPin, StaffError } from './api.ts'
import { normalizeStaffCode } from './credentials.ts'

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

const created = { id: 'm1', code: 'K7QX2M', full_name: 'Cook 1', role: 'kitchen', is_active: true, pin: '482913' }

describe('staff API', () => {
  it('creates a member with only the client id, name and role and returns the code and PIN', async () => {
    const calls = stubFetch(new Response(JSON.stringify(created), { status: 201 }))

    const member = await createStaffMember({ id: 'm1', full_name: 'Cook 1', role: 'kitchen' })

    expect(calls[0].url).toBe('/api/v1/staff')
    expect(calls[0].init?.method).toBe('POST')
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ id: 'm1', full_name: 'Cook 1', role: 'kitchen' })
    expect(member).toEqual(created)
  })

  it('lists members with their code', async () => {
    const listed = { id: 'm1', code: 'K7QX2M', full_name: 'Cook 1', role: 'kitchen', is_active: true }
    stubFetch(new Response(JSON.stringify({ items: [listed], next_cursor: null }), { status: 200 }))

    expect(await listStaff()).toEqual([listed])
  })

  it('generates a new PIN without a body and returns the credentials', async () => {
    const calls = stubFetch(new Response(JSON.stringify({ ...created, pin: '120394' }), { status: 200 }))

    const member = await regenerateStaffPin('m1')

    expect(calls[0].url).toBe('/api/v1/staff/m1/pin')
    expect(calls[0].init?.method).toBe('POST')
    expect(calls[0].init?.body).toBeUndefined()
    expect(member.pin).toBe('120394')
  })

  it('tells a repeated create of an existing member apart from an id used by something else', async () => {
    stubFetch(
      problem(409, 'This staff member was already created; generate a new PIN to see the credentials'),
      problem(409, 'That id is already used by something else'),
    )

    const repeated = await createStaffMember({ id: 'm1', full_name: 'Cook 1', role: 'kitchen' }).catch(
      (caught: unknown) => caught,
    )
    const clash = await createStaffMember({ id: 'm1', full_name: 'Cook 1', role: 'kitchen' }).catch(
      (caught: unknown) => caught,
    )

    expect(repeated).toBeInstanceOf(StaffError)
    expect((repeated as StaffError).alreadyCreated).toBe(true)
    expect((repeated as StaffError).message).toBe(
      'This staff member was already created; generate a new PIN to see the credentials.',
    )
    expect((clash as StaffError).alreadyCreated).toBe(false)
    expect((clash as StaffError).message).toBe('That id is already used by something else.')
  })
})

describe('normalizeStaffCode', () => {
  it('uppercases the code as typed and drops spaces', () => {
    expect(normalizeStaffCode('k7q x2m ')).toBe('K7QX2M')
    expect(normalizeStaffCode('demo.mesero')).toBe('DEMO.MESERO')
  })
})
