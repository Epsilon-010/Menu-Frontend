import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addCartLine,
  fetchCart,
  fetchMenu,
  fetchOrders,
  OrderingError,
  removeCartLine,
  submitOrder,
  updateCartLine,
  type Cart,
} from './api.ts'

const CART: Cart = { version: 3, lines: [], total_cents: 0 }

function ok(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function problem(status: number, detail?: string, extra: Record<string, unknown> = {}): Response {
  return new Response(
    JSON.stringify({ type: 'about:blank', title: 'Problem', status, ...(detail ? { detail } : {}), ...extra }),
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )
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

async function failureOf(promise: Promise<unknown>): Promise<OrderingError> {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  )
  expect(error).toBeInstanceOf(OrderingError)
  return error as OrderingError
}

function methodsAndUrls(calls: { url: string; init?: RequestInit }[]): string[][] {
  return calls.map((call) => [call.init?.method ?? 'GET', call.url])
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('table ordering API', () => {
  it('reads the menu, the shared cart and the orders of the visit', async () => {
    const calls = stubFetch(ok([]), ok(CART), ok([]))

    await fetchMenu()
    expect(await fetchCart()).toEqual(CART)
    await fetchOrders()

    expect(methodsAndUrls(calls)).toEqual([
      ['GET', '/api/v1/menu'],
      ['GET', '/api/v1/table/cart'],
      ['GET', '/api/v1/table/orders'],
    ])
  })

  it('adds a line with its client id and returns the whole cart', async () => {
    const calls = stubFetch(ok(CART))

    const cart = await addCartLine({ id: 'l1', item_id: 'i1', quantity: 2, note: 'No onion' })

    expect(cart).toEqual(CART)
    expect(methodsAndUrls(calls)).toEqual([['POST', '/api/v1/table/cart/lines']])
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ id: 'l1', item_id: 'i1', quantity: 2, note: 'No onion' })
  })

  it('changes a line with PATCH and only the changed fields', async () => {
    const calls = stubFetch(ok(CART))

    await updateCartLine('l1', { quantity: 4 })

    expect(methodsAndUrls(calls)).toEqual([['PATCH', '/api/v1/table/cart/lines/l1']])
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ quantity: 4 })
  })

  it('counts removing a line that is already gone as done and reloads the cart', async () => {
    const calls = stubFetch(problem(404, 'Cart line not found'), ok(CART))

    expect(await removeCartLine('l1')).toEqual(CART)
    expect(methodsAndUrls(calls)).toEqual([
      ['DELETE', '/api/v1/table/cart/lines/l1'],
      ['GET', '/api/v1/table/cart'],
    ])
  })

  it('sends the order with the draft id and the cart version that was reviewed', async () => {
    const calls = stubFetch(ok({ id: 'o1', number: 7 }, 201))

    await submitOrder('o1', 3)

    expect(methodsAndUrls(calls)).toEqual([['POST', '/api/v1/table/orders']])
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ id: 'o1', cart_version: 3 })
  })

  it('tells a changed cart apart from other conflicts', async () => {
    stubFetch(problem(409, 'The order changed, review it'))
    const changed = await failureOf(submitOrder('o1', 3))
    expect(changed.message).toBe('The order changed, review it.')
    expect(changed.cartChanged).toBe(true)

    stubFetch(problem(409, 'The order is empty'))
    const empty = await failureOf(submitOrder('o1', 3))
    expect(empty.message).toBe('The order is empty.')
    expect(empty.cartChanged).toBe(false)
  })

  it('surfaces which items are no longer available', async () => {
    stubFetch(problem(409, 'Some items are no longer available', { unavailable_item_ids: ['i1', 'i2'] }))

    const failure = await failureOf(addCartLine({ item_id: 'i1', quantity: 1, note: '' }))

    expect(failure.status).toBe(409)
    expect(failure.message).toBe('Some items are no longer available.')
    expect(failure.unavailableItemIds).toEqual(['i1', 'i2'])
  })

  it('says the server is unreachable when the request never gets an answer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )

    expect((await failureOf(fetchCart())).message).toBe('Could not reach the server. Check your connection and try again.')
  })

  it('does not show internal details of a server failure', async () => {
    stubFetch(problem(500, 'Internal Server Error'))

    expect((await failureOf(fetchCart())).message).toBe('The server could not complete that. Please try again in a moment.')
  })
})
