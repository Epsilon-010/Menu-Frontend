import { afterEach, describe, expect, it, vi } from 'vitest'
import { CatalogError } from '../catalog/api.ts'
import { failure, ok, problem, stubFetch } from '../kitchen/testing.ts'
import { createModifierGroup, deleteModifierGroup, listModifierGroups, updateModifierGroup } from './api.ts'

const group = {
  id: 'g1',
  name: 'Size',
  min_select: 1,
  max_select: 1,
  options: [{ id: 'o1', name: 'Small', price_cents: 0, is_available: true }],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('modifier groups API', () => {
  it('lists the library', async () => {
    const calls = stubFetch(ok([group]))
    expect(await listModifierGroups()).toEqual([group])
    expect(calls[0].url).toBe('/api/v1/catalog/modifier-groups')
  })

  it('creates a group with the client id and its options', async () => {
    const calls = stubFetch(ok(group, 201))
    const body = {
      id: 'g1',
      name: 'Size',
      min_select: 1,
      max_select: 1,
      options: [{ name: 'Small', price_cents: 0, is_available: true }],
    }
    expect(await createModifierGroup(body)).toEqual(group)
    expect(calls[0].url).toBe('/api/v1/catalog/modifier-groups')
    expect(calls[0].init?.method).toBe('POST')
    expect(JSON.parse(String(calls[0].init?.body))).toEqual(body)
  })

  it('patches a group with the full ordered option list', async () => {
    const calls = stubFetch(ok(group))
    const changes = {
      name: 'Size',
      min_select: 0,
      max_select: 2,
      options: [
        { id: 'o1', name: 'Small', price_cents: 0, is_available: true },
        { name: 'Large', price_cents: 1250, is_available: true },
      ],
    }
    await updateModifierGroup('g1', changes)
    expect(calls[0].url).toBe('/api/v1/catalog/modifier-groups/g1')
    expect(calls[0].init?.method).toBe('PATCH')
    expect(JSON.parse(String(calls[0].init?.body))).toEqual(changes)
  })

  it('treats deleting a group already gone as done', async () => {
    const calls = stubFetch(problem(404, 'Modifier group not found'))
    await expect(deleteModifierGroup('g1')).resolves.toBeUndefined()
    expect(calls[0].url).toBe('/api/v1/catalog/modifier-groups/g1')
    expect(calls[0].init?.method).toBe('DELETE')
  })

  it('shows the rule the server rejected', async () => {
    stubFetch(problem(422, 'Invalid selection limits'))
    const error = await failure(createModifierGroup({ name: 'Size', min_select: 2, max_select: 1, options: [] }))
    expect(error).toBeInstanceOf(CatalogError)
    expect((error as CatalogError).message).toBe('Invalid selection limits.')
  })
})
