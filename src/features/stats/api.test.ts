import { afterEach, describe, expect, it, vi } from 'vitest'
import { OrdersError } from '../kitchen/api.ts'
import { failure, ok, problem, stubFetch } from '../kitchen/testing.ts'
import { fetchStatistics, fetchTenantSettings, updateTenantSettings } from './api.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('statistics API', () => {
  it('asks for whole days with from and to', async () => {
    const calls = stubFetch(ok({ from: '2026-10-24', to: '2026-10-30' }))

    await fetchStatistics({ from: '2026-10-24', to: '2026-10-30' })

    expect(calls[0].url).toBe('/api/v1/stats?from=2026-10-24&to=2026-10-30')
  })

  it('shows the server message for an invalid range', async () => {
    stubFetch(problem(422, 'The range can be at most 366 days'))

    const error = (await failure(fetchStatistics({ from: '2026-01-01', to: '2027-12-31' }))) as OrdersError

    expect(error.message).toBe('The range can be at most 366 days.')
  })
})

describe('tenant settings API', () => {
  it('reads and changes the time zone', async () => {
    const calls = stubFetch(ok({ timezone: 'America/Mexico_City' }), ok({ timezone: 'America/Bogota' }))

    expect(await fetchTenantSettings()).toEqual({ timezone: 'America/Mexico_City' })
    expect(await updateTenantSettings({ timezone: 'America/Bogota' })).toEqual({ timezone: 'America/Bogota' })

    expect(calls.map((call) => [call.init?.method ?? 'GET', call.url, call.init?.body ?? null])).toEqual([
      ['GET', '/api/v1/tenant/settings', null],
      ['PATCH', '/api/v1/tenant/settings', JSON.stringify({ timezone: 'America/Bogota' })],
    ])
  })

  it('shows the server message for an unknown zone', async () => {
    stubFetch(problem(422, 'Unknown time zone'))

    const error = (await failure(updateTenantSettings({ timezone: 'Mars/Olympus' }))) as OrdersError

    expect(error.message).toBe('Unknown time zone.')
  })
})
