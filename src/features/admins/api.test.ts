import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminsError, createAdmin, listAdmins, updateAdmin } from './api.ts'

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

const admin = { id: 'a1', email: 'manager@example.com', full_name: 'Manager', is_active: true, must_change_password: true }

describe('admins API', () => {
  it('creates an admin with the client id, name and email and returns the temporary password', async () => {
    const calls = stubFetch(new Response(JSON.stringify({ ...admin, temporary_password: 'K7QX2MABCDEF' }), { status: 201 }))

    const created = await createAdmin({ id: 'a1', full_name: 'Manager', email: 'manager@example.com' })

    expect(calls[0].url).toBe('/api/v1/admins')
    expect(calls[0].init?.method).toBe('POST')
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ id: 'a1', full_name: 'Manager', email: 'manager@example.com' })
    expect(created.temporary_password).toBe('K7QX2MABCDEF')
  })

  it('lists the admins', async () => {
    stubFetch(new Response(JSON.stringify({ items: [admin], next_cursor: null }), { status: 200 }))

    expect(await listAdmins()).toEqual([admin])
  })

  it('sends only the changed fields when deactivating', async () => {
    const calls = stubFetch(new Response(JSON.stringify({ ...admin, is_active: false }), { status: 200 }))

    const updated = await updateAdmin('a1', { is_active: false })

    expect(calls[0].url).toBe('/api/v1/admins/a1')
    expect(calls[0].init?.method).toBe('PATCH')
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ is_active: false })
    expect(updated.is_active).toBe(false)
  })

  it('tells a repeated create apart from other conflicts and shows the server message', async () => {
    stubFetch(
      problem(409, 'This admin was already created'),
      problem(409, 'Email already in use'),
      problem(409, 'You cannot deactivate your own account'),
    )

    const replay = await createAdmin({ full_name: 'Manager', email: 'manager@example.com' }).catch((e: unknown) => e)
    const taken = await createAdmin({ full_name: 'Manager', email: 'manager@example.com' }).catch((e: unknown) => e)
    const self = await updateAdmin('a1', { is_active: false }).catch((e: unknown) => e)

    expect(replay).toBeInstanceOf(AdminsError)
    expect((replay as AdminsError).alreadyCreated).toBe(true)
    expect((taken as AdminsError).alreadyCreated).toBe(false)
    expect((taken as AdminsError).message).toBe('Email already in use.')
    expect((self as AdminsError).message).toBe('You cannot deactivate your own account.')
  })

  it('reports a network failure as offline', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))))

    await expect(listAdmins()).rejects.toThrow('Could not reach the server')
  })
})
