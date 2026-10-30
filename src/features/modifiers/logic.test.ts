import { describe, expect, it } from 'vitest'
import type { ModifierGroup } from './api.ts'
import {
  blankOption,
  formFromGroup,
  groupPayload,
  groupsToSave,
  moveRow,
  pickInOrder,
  selectionRule,
  type GroupForm,
} from './logic.ts'

function form(overrides: Partial<GroupForm> = {}): GroupForm {
  return {
    name: 'Size',
    min_select: '1',
    max_select: '1',
    options: [
      { key: 'a', id: 'o1', name: 'Small', price: '', is_available: true },
      { key: 'b', name: 'Large', price: '12.50', is_available: false },
    ],
    ...overrides,
  }
}

function errorOf(result: ReturnType<typeof groupPayload>): string {
  if (!('error' in result)) throw new Error('Expected an error')
  return result.error
}

describe('selection rule in plain words', () => {
  it('says a group is required when the minimum equals the maximum', () => {
    expect(selectionRule(1, 1)).toBe('Required · choose 1')
    expect(selectionRule(2, 2)).toBe('Required · choose 2')
  })

  it('says a group is optional when the minimum is zero', () => {
    expect(selectionRule(0, 3)).toBe('Optional · up to 3')
    expect(selectionRule(0, 1)).toBe('Optional · up to 1')
  })

  it('gives the range otherwise', () => {
    expect(selectionRule(1, 2)).toBe('Choose 1 to 2')
  })
})

describe('group payload', () => {
  it('builds the body in order, keeping option ids and converting prices to cents', () => {
    expect(groupPayload(form({ name: '  Size  ' }))).toEqual({
      payload: {
        name: 'Size',
        min_select: 1,
        max_select: 1,
        options: [
          { id: 'o1', name: 'Small', price_cents: 0, is_available: true },
          { name: 'Large', price_cents: 1250, is_available: false },
        ],
      },
    })
  })

  it('needs a group name of up to 80 characters', () => {
    expect(errorOf(groupPayload(form({ name: '   ' })))).toBe('Give the group a name, like Size or Extras.')
    expect(errorOf(groupPayload(form({ name: 'x'.repeat(81) })))).toBe('The group name can have up to 80 characters.')
  })

  it('needs 1 to 30 options', () => {
    expect(errorOf(groupPayload(form({ options: [] })))).toBe('Add at least one option.')
    const many = Array.from({ length: 31 }, (_, index) => ({ ...blankOption(`k${index}`), name: `Option ${index}` }))
    expect(errorOf(groupPayload(form({ options: many, min_select: '0' })))).toBe('A group can have up to 30 options.')
  })

  it('needs every option named, up to 80 characters, unique ignoring case', () => {
    const [small, large] = form().options
    expect(errorOf(groupPayload(form({ options: [small, { ...large, name: ' ' }] })))).toBe('Give every option a name.')
    expect(errorOf(groupPayload(form({ options: [small, { ...large, name: 'x'.repeat(81) }] })))).toBe(
      'Option names can have up to 80 characters.',
    )
    expect(errorOf(groupPayload(form({ options: [small, { ...large, name: ' SMALL ' }] })))).toBe(
      'Option names must be unique in a group.',
    )
  })

  it('needs a valid price for each option', () => {
    const [small, large] = form().options
    const message = 'Enter a price from 0 to 100000.00 for Large, like 5 or 5.50.'
    expect(errorOf(groupPayload(form({ options: [small, { ...large, price: '-1' }] })))).toBe(message)
    expect(errorOf(groupPayload(form({ options: [small, { ...large, price: '100000.01' }] })))).toBe(message)
  })

  it('needs 0 <= min <= max and 1 <= max <= number of options', () => {
    const limits =
      'Invalid selection limits. The minimum goes from 0 to the maximum, and the maximum from 1 to 2 (the number of options).'
    expect(errorOf(groupPayload(form({ min_select: '2', max_select: '1' })))).toBe(limits)
    expect(errorOf(groupPayload(form({ min_select: '0', max_select: '0' })))).toBe(limits)
    expect(errorOf(groupPayload(form({ min_select: '0', max_select: '3' })))).toBe(limits)
    expect(errorOf(groupPayload(form({ min_select: '-1', max_select: '1' })))).toBe(limits)
    expect(errorOf(groupPayload(form({ min_select: '1.5', max_select: '2' })))).toBe(limits)
    expect(errorOf(groupPayload(form({ min_select: '', max_select: '2' })))).toBe(limits)
    expect(groupPayload(form({ min_select: '0', max_select: '2' }))).toHaveProperty('payload')
  })
})

describe('editor rows', () => {
  it('fills the form from a saved group, one row per option keyed by its id', () => {
    const group: ModifierGroup = {
      id: 'g1',
      name: 'Extras',
      min_select: 0,
      max_select: 2,
      options: [{ id: 'o1', name: 'Cheese', price_cents: 1500, is_available: false }],
    }
    expect(formFromGroup(group)).toEqual({
      name: 'Extras',
      min_select: '0',
      max_select: '2',
      options: [{ key: 'o1', id: 'o1', name: 'Cheese', price: '15.00', is_available: false }],
    })
  })

  it('starts a new group as required, choose 1, with one blank option', () => {
    expect(formFromGroup(undefined, () => 'k1')).toEqual({
      name: '',
      min_select: '1',
      max_select: '1',
      options: [{ key: 'k1', name: '', price: '', is_available: true }],
    })
  })

  it('moves a row up or down and ignores moves past the ends', () => {
    expect(moveRow(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b'])
    expect(moveRow(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
    expect(moveRow(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c'])
    expect(moveRow(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c'])
  })
})

describe('picking in a fixed order', () => {
  it('keeps the choices in the order of the full list, once each (badges and modifier groups)', () => {
    const all = ['new', 'popular', 'spicy', 'vegan']
    expect(pickInOrder(all, ['vegan'], 'new', true)).toEqual(['new', 'vegan'])
    expect(pickInOrder(all, ['new', 'vegan'], 'new', true)).toEqual(['new', 'vegan'])
    expect(pickInOrder(all, ['new', 'vegan'], 'new', false)).toEqual(['vegan'])
  })
})

describe('groups an item saves', () => {
  const library = [
    { id: 'g1', name: 'Extras', min_select: 0, max_select: 2, options: [] },
    { id: 'g2', name: 'Size', min_select: 1, max_select: 1, options: [] },
  ] satisfies ModifierGroup[]

  it('keeps the current groups untouched when the library did not load', () => {
    expect(groupsToSave(null, ['g2', 'gone', 'g1'])).toEqual(['g2', 'gone', 'g1'])
  })

  it('drops groups deleted meanwhile and sends the rest in library order', () => {
    expect(groupsToSave(library, ['g2', 'gone', 'g1'])).toEqual(['g1', 'g2'])
    expect(groupsToSave(library, [])).toEqual([])
  })
})
