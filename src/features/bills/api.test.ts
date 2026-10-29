import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addOrderDish,
  BillError,
  closeTable,
  dismissBillRequest,
  listTableBills,
  openTable,
  registerPayment,
} from './api.ts'

function ok(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

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

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('bills API', () => {
  it('attends a bill request with DELETE and counts one already gone as done', async () => {
    const calls = stubFetch(new Response(null, { status: 204 }), problem(404, 'Bill not found'))

    await dismissBillRequest('b1')
    await dismissBillRequest('b1')

    expect(calls.map((call) => [call.init?.method, call.url])).toEqual([
      ['DELETE', '/api/v1/bills/b1/request'],
      ['DELETE', '/api/v1/bills/b1/request'],
    ])
  })

  it('lists the tables with their bills', async () => {
    const calls = stubFetch(ok([{ table_id: 't1', table_name: 'Mesa 4', bill: null }]))

    expect(await listTableBills()).toEqual([{ table_id: 't1', table_name: 'Mesa 4', bill: null }])
    expect(calls[0].url).toBe('/api/v1/bills/tables')
  })

  it('opens a table, registers a payment and closes an empty table', async () => {
    const calls = stubFetch(ok({ id: 'b1' }), ok({ id: 'b1' }), new Response(null, { status: 204 }))

    await openTable('t1')
    await registerPayment('b1', 'card')
    await closeTable('b1')

    expect(calls.map((call) => [call.init?.method, call.url, call.init?.body ?? null])).toEqual([
      ['POST', '/api/v1/bills', JSON.stringify({ table_id: 't1' })],
      ['POST', '/api/v1/bills/b1/payment', JSON.stringify({ method: 'card' })],
      ['POST', '/api/v1/bills/b1/close', null],
    ])
  })

  it('shows the server message when a table with orders is closed without paying', async () => {
    stubFetch(problem(409, 'A bill with orders is closed by registering its payment'))

    const error = await closeTable('b1').then(
      () => null,
      (caught: unknown) => caught,
    )

    expect(error).toBeInstanceOf(BillError)
    expect((error as BillError).message).toBe('A bill with orders is closed by registering its payment.')
    expect((error as BillError).status).toBe(409)
  })
})

describe('adding a dish to an open order', () => {
  it('posts the dish with its client id and answers with the order', async () => {
    const calls = stubFetch(ok({ id: 'o1', number: 4 }, 201))

    expect(await addOrderDish('o1', { id: 'd1', item_id: 'm1', quantity: 2, note: ' No onion ' })).toEqual({
      id: 'o1',
      number: 4,
    })
    expect(calls.map((call) => [call.init?.method, call.url, call.init?.body])).toEqual([
      ['POST', '/api/v1/orders/o1/items', JSON.stringify({ id: 'd1', item_id: 'm1', quantity: 2, note: 'No onion' })],
    ])
  })

  it('shows the server message when the bill was already paid', async () => {
    stubFetch(problem(409, 'This bill is already paid; its dishes can no longer change'))

    const error = await addOrderDish('o1', { id: 'd1', item_id: 'm1', quantity: 1, note: '' }).then(
      () => null,
      (caught: unknown) => caught,
    )

    expect(error).toBeInstanceOf(BillError)
    expect((error as BillError).message).toBe('This bill is already paid; its dishes can no longer change.')
    expect((error as BillError).status).toBe(409)
  })
})
