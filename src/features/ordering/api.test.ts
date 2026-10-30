import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addCartLine,
  cancelBillRequest,
  fetchBillRequest,
  fetchCart,
  fetchMenu,
  fetchOrders,
  OrderingError,
  removeCartLine,
  requestBill,
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
  it('reads, asks for and cancels the bill request of the table', async () => {
    const calls = stubFetch(
      ok({ requested_at: null }),
      ok({ requested_at: '2026-10-28T18:24:00Z' }),
      new Response(null, { status: 204 }),
    )

    expect(await fetchBillRequest()).toBeNull()
    expect(await requestBill()).toBe('2026-10-28T18:24:00Z')
    await cancelBillRequest()

    expect(calls.map((call) => [call.init?.method ?? 'GET', call.url])).toEqual([
      ['GET', '/api/v1/table/bill-request'],
      ['POST', '/api/v1/table/bill-request'],
      ['DELETE', '/api/v1/table/bill-request'],
    ])
  })

  it('shows why the bill cannot be asked for yet', async () => {
    stubFetch(problem(409, 'There is nothing to pay yet'))

    const error = await requestBill().then(
      () => null,
      (caught: unknown) => caught,
    )

    expect(error).toBeInstanceOf(OrderingError)
    expect((error as OrderingError).message).toBe('There is nothing to pay yet.')
  })

  it('gives every menu item its known badges only, and none when an older server sends no badges', async () => {
    const item = { id: 'i1', name: 'Pastor', description: '', price_cents: 2500, image: null }
    stubFetch(ok([{ id: 'c1', name: 'Tacos', items: [item, { ...item, id: 'i2', badges: ['spicy', 'organic', 'new'] }] }]))

    const [tacos] = await fetchMenu()

    expect(tacos.items.map((each) => each.badges)).toEqual([[], ['new', 'spicy']])
  })

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

  it('reads the option groups of each menu item, and none from an older server', async () => {
    const item = { id: 'i1', name: 'Taco', description: '', price_cents: 2500, image: null, badges: [] }
    const size = {
      id: 'g1',
      name: 'Size',
      min_select: 1,
      max_select: 1,
      options: [{ id: 'o1', name: 'Large', price_cents: 1500, available: true }],
    }
    stubFetch(ok([{ id: 'c1', name: 'Tacos', items: [item, { ...item, id: 'i2', modifier_groups: [size] }] }]))

    const [tacos] = await fetchMenu()

    expect(tacos.items.map((each) => each.modifier_groups)).toEqual([[], [size]])
  })

  it('sends the chosen options of a new line only when there are some', async () => {
    const calls = stubFetch(ok(CART), ok(CART))

    await addCartLine({ id: 'l1', item_id: 'i1', quantity: 1, note: '', modifier_option_ids: ['o1', 'o2'] })
    await addCartLine({ id: 'l2', item_id: 'i2', quantity: 1, note: '', modifier_option_ids: [] })

    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      id: 'l1',
      item_id: 'i1',
      quantity: 1,
      note: '',
      modifier_option_ids: ['o1', 'o2'],
    })
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({ id: 'l2', item_id: 'i2', quantity: 1, note: '' })
  })

  it('replaces the options of a line with PATCH', async () => {
    const calls = stubFetch(ok(CART))

    await updateCartLine('l1', { modifier_option_ids: ['o3'] })

    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ modifier_option_ids: ['o3'] })
  })

  it('reads the options of cart lines and sent dishes, and none from an older server', async () => {
    const line = {
      id: 'l1',
      item_id: 'i1',
      name: 'Taco',
      quantity: 1,
      note: '',
      added_by: 'Guest 1',
      available: true,
      unit_price_cents: 4000,
      subtotal_cents: 4000,
    }
    const chosen = [{ option_id: 'o1', group: 'Size', name: 'Large', price_cents: 1500 }]
    const dish = { ...line, status: 'queued', cancel_reason: null }
    const order = { id: 'o1', number: 1, status: 'queued', sent_by: 'Guest 1', created_at: '', total_cents: 0 }
    stubFetch(
      ok({ version: 1, total_cents: 4000, lines: [line, { ...line, id: 'l2', modifiers: chosen }] }),
      ok([{ ...order, items: [dish, { ...dish, id: 'd2', modifiers: [{ group: 'Size', name: 'Large', price_cents: 1500 }] }] }]),
    )

    const cart = await fetchCart()
    const [sent] = await fetchOrders()

    expect(cart.lines.map((each) => each.modifiers)).toEqual([[], chosen])
    expect(sent.items.map((each) => each.modifiers)).toEqual([[], [{ group: 'Size', name: 'Large', price_cents: 1500 }]])
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
