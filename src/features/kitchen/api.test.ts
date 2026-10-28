import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchKitchenOrders, OrdersError, updateItemStatus, type StaffOrder } from './api.ts'
import { failure, ok, problem, stubFetch } from './testing.ts'

const ORDER: StaffOrder = {
  id: 'o1',
  number: 12,
  table_id: 't1',
  table_name: 'Table 1',
  sent_by: 'Guest 1',
  created_at: '2026-10-28T12:00:00Z',
  status: 'queued',
  items: [],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('kitchen API', () => {
  it('lists the kitchen queue', async () => {
    const calls = stubFetch(ok([ORDER]))

    expect(await fetchKitchenOrders()).toEqual([ORDER])
    expect(calls[0].url).toBe('/api/v1/kitchen/orders')
  })

  it('marks dishes of one order and answers with the order', async () => {
    const calls = stubFetch(ok(ORDER), ok(ORDER))

    expect(await updateItemStatus('o1', ['i1', 'i2'], 'preparing')).toEqual(ORDER)
    await updateItemStatus('o1', ['i3'], 'cancelled', '  Out of avocado ')

    expect(calls.map((call) => [call.init?.method, call.url, call.init?.body])).toEqual([
      ['POST', '/api/v1/orders/o1/items/status', JSON.stringify({ item_ids: ['i1', 'i2'], status: 'preparing' })],
      [
        'POST',
        '/api/v1/orders/o1/items/status',
        JSON.stringify({ item_ids: ['i3'], status: 'cancelled', reason: 'Out of avocado' }),
      ],
    ])
  })

  it('recognizes dishes that changed meanwhile', async () => {
    stubFetch(problem(409, 'Some dishes already changed; reload the order'))

    const error = await failure(updateItemStatus('o1', ['i1'], 'ready'))

    expect(error).toBeInstanceOf(OrdersError)
    expect((error as OrdersError).message).toBe('Some dishes already changed; reload the order.')
    expect((error as OrdersError).dishesChanged).toBe(true)
    expect((error as OrdersError).status).toBe(409)
  })

  it('shows the server message for a role that cannot mark dishes', async () => {
    stubFetch(problem(403, 'Your role cannot mark dishes as delivered'))

    const error = (await failure(updateItemStatus('o1', ['i1'], 'delivered'))) as OrdersError

    expect(error.message).toBe('Your role cannot mark dishes as delivered.')
    expect(error.dishesChanged).toBe(false)
  })

  it('explains offline and server failures without internals', async () => {
    stubFetch(new TypeError('Failed to fetch'), problem(500, 'boom'), problem(422))

    expect(((await failure(fetchKitchenOrders())) as OrdersError).message).toBe(
      'Could not reach the server. Check your connection and try again.',
    )
    expect(((await failure(fetchKitchenOrders())) as OrdersError).message).toBe(
      'The server could not complete that. Please try again in a moment.',
    )
    expect(((await failure(fetchKitchenOrders())) as OrdersError).message).toBe('Please check the fields and try again.')
  })
})
