import { afterEach, describe, expect, it, vi } from 'vitest'
import { OrdersError } from '../kitchen/api.ts'
import { failure, ok, problem, stubFetch } from '../kitchen/testing.ts'
import { fetchOrderSettings, updateOrderSettings } from './api.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('order settings API', () => {
  it('reads and changes the late order threshold', async () => {
    const calls = stubFetch(ok({ late_order_minutes: 15 }), ok({ late_order_minutes: 20 }))

    expect(await fetchOrderSettings()).toEqual({ late_order_minutes: 15 })
    expect(await updateOrderSettings({ late_order_minutes: 20 })).toEqual({ late_order_minutes: 20 })

    expect(calls.map((call) => [call.init?.method ?? 'GET', call.url, call.init?.body ?? null])).toEqual([
      ['GET', '/api/v1/orders/settings', null],
      ['PATCH', '/api/v1/orders/settings', JSON.stringify({ late_order_minutes: 20 })],
    ])
  })

  it('shows the server message when the value is rejected', async () => {
    stubFetch(problem(422, 'Invalid fields: late_order_minutes'))

    const error = (await failure(updateOrderSettings({ late_order_minutes: 999 }))) as OrdersError

    expect(error).toBeInstanceOf(OrdersError)
    expect(error.message).toBe('Invalid fields: late_order_minutes.')
  })
})
