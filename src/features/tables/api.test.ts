import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTable, TableError } from './api.ts'

function problem(status: number, detail?: string): Response {
  return new Response(JSON.stringify({ type: 'about:blank', title: 'Problem', status, ...(detail ? { detail } : {}) }), {
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

async function failureOf(promise: Promise<unknown>): Promise<TableError> {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  )
  expect(error).toBeInstanceOf(TableError)
  return error as TableError
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('tables API', () => {
  it('sends the client id, so repeating the create never makes a second table', async () => {
    const calls = stubFetch(new Response(JSON.stringify({ id: 't1', pin: '123456' }), { status: 201 }))

    await createTable('Mesa 4', 't1')

    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ id: 't1', name: 'Mesa 4' })
  })

  it('shows what the server says for each conflict instead of guessing from the status', async () => {
    stubFetch(problem(409, 'This table was already created; generate a new PIN to see its credentials'))
    const replay = await failureOf(createTable('Mesa 4', 't1'))
    expect(replay.message).toBe('This table was already created; generate a new PIN to see its credentials.')
    expect(replay.alreadyCreated).toBe(true)

    stubFetch(problem(409, 'Table name already in use'))
    const taken = await failureOf(createTable('Mesa 4', 't2'))
    expect(taken.message).toBe('Table name already in use.')
    expect(taken.alreadyCreated).toBe(false)
  })

  it('says the server failed, not that it is unreachable, on a 500', async () => {
    stubFetch(new Response('boom', { status: 500 }))

    expect((await failureOf(createTable('Mesa 4', 't1'))).message).toBe(
      'The server could not complete that. Please try again in a moment.',
    )
  })
})
