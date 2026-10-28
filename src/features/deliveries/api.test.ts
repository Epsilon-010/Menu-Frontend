import { afterEach, describe, expect, it, vi } from 'vitest'
import { OrdersError } from '../kitchen/api.ts'
import { failure, ok, problem, stubFetch } from '../kitchen/testing.ts'
import { fetchDeliveries } from './api.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('deliveries API', () => {
  it('lists the orders with dishes ready to take, in the order the server sorted them', async () => {
    const calls = stubFetch(ok([{ id: 'o2' }, { id: 'o1' }]))

    expect(await fetchDeliveries()).toEqual([{ id: 'o2' }, { id: 'o1' }])
    expect(calls[0].url).toBe('/api/v1/deliveries')
  })

  it('shows the server message when the role cannot see deliveries', async () => {
    stubFetch(problem(403, 'Not allowed'))

    const error = await failure(fetchDeliveries())

    expect(error).toBeInstanceOf(OrdersError)
    expect((error as OrdersError).message).toBe('Not allowed.')
  })
})
