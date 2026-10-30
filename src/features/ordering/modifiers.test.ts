import { describe, expect, it } from 'vitest'
import type { MenuItem, ModifierGroup } from './api.ts'
import { lineDraftKey } from './logic.ts'
import {
  dishLabel,
  groupHint,
  initialSelection,
  isBlocked,
  modifierSummary,
  ruleMessage,
  selectionError,
  toggleOption,
  unitPrice,
} from './modifiers.ts'

const SIZE: ModifierGroup = {
  id: 'size',
  name: 'Size',
  min_select: 1,
  max_select: 1,
  options: [
    { id: 'small', name: 'Small', price_cents: 0, available: true },
    { id: 'large', name: 'Large', price_cents: 1500, available: true },
    { id: 'huge', name: 'Huge', price_cents: 3000, available: false },
  ],
}

const EXTRAS: ModifierGroup = {
  id: 'extras',
  name: 'Extras',
  min_select: 0,
  max_select: 2,
  options: [
    { id: 'cheese', name: 'Cheese', price_cents: 1000, available: true },
    { id: 'avocado', name: 'Avocado', price_cents: 2000, available: true },
    { id: 'onion', name: 'Onion', price_cents: 0, available: true },
  ],
}

const SAUCES: ModifierGroup = {
  id: 'sauces',
  name: 'Sauces',
  min_select: 1,
  max_select: 2,
  options: [
    { id: 'red', name: 'Red', price_cents: 0, available: true },
    { id: 'green', name: 'Green', price_cents: 0, available: true },
  ],
}

const TACO: MenuItem = {
  id: 'taco',
  name: 'Taco',
  description: '',
  price_cents: 2500,
  image: null,
  badges: [],
  modifier_groups: [SIZE, EXTRAS],
}

describe('the rule of a group', () => {
  it('uses the server wording for each kind of limit', () => {
    expect(ruleMessage(SIZE)).toBe('Choose 1 option for Size')
    expect(ruleMessage({ ...EXTRAS, max_select: 3 })).toBe('Choose up to 3 options for Extras')
    expect(ruleMessage({ ...EXTRAS, max_select: 1 })).toBe('Choose up to 1 option for Extras')
    expect(ruleMessage({ ...SIZE, max_select: 2 })).toBe('Choose between 1 and 2 options for Size')
    expect(ruleMessage({ ...SAUCES, min_select: 2 })).toBe('Choose 2 options for Sauces')
  })

  it('has a short hint for the picker', () => {
    expect(groupHint(SIZE)).toBe('Choose 1')
    expect(groupHint(EXTRAS)).toBe('Optional, up to 2')
    expect(groupHint(SAUCES)).toBe('Choose 1 to 2')
  })
})

describe('selectionError', () => {
  it('names the first unmet rule in the item order', () => {
    expect(selectionError(TACO.modifier_groups, [])).toBe('Choose 1 option for Size')
    expect(selectionError(TACO.modifier_groups, ['large'])).toBeNull()
    expect(selectionError(TACO.modifier_groups, ['large', 'cheese', 'avocado', 'onion'])).toBe(
      'Choose up to 2 options for Extras',
    )
    expect(selectionError([SAUCES], [])).toBe('Choose between 1 and 2 options for Sauces')
  })

  it('counts a sold out option as not chosen', () => {
    expect(selectionError(TACO.modifier_groups, ['huge'])).toBe('Choose 1 option for Size')
  })

  it('accepts anything for an item without groups', () => {
    expect(selectionError([], [])).toBeNull()
  })
})

describe('toggleOption', () => {
  it('replaces the choice in a group of one (radio)', () => {
    expect(toggleOption(TACO.modifier_groups, ['small', 'cheese'], 'large')).toEqual(['cheese', 'large'])
  })

  it('keeps a required radio choice when tapped again, but lets an optional one go', () => {
    expect(toggleOption(TACO.modifier_groups, ['small'], 'small')).toEqual(['small'])
    const optional = [{ ...SIZE, min_select: 0 }]
    expect(toggleOption(optional, ['small'], 'small')).toEqual([])
  })

  it('adds and removes checkboxes and blocks picking beyond the maximum', () => {
    let selected = toggleOption(TACO.modifier_groups, [], 'cheese')
    selected = toggleOption(TACO.modifier_groups, selected, 'avocado')
    expect(selected).toEqual(['cheese', 'avocado'])
    expect(toggleOption(TACO.modifier_groups, selected, 'onion')).toEqual(['cheese', 'avocado'])
    expect(isBlocked(EXTRAS, selected, EXTRAS.options[2])).toBe(true)
    expect(isBlocked(EXTRAS, selected, EXTRAS.options[0])).toBe(false)
    expect(toggleOption(TACO.modifier_groups, selected, 'cheese')).toEqual(['avocado'])
  })

  it('never picks a sold out option or an unknown one', () => {
    expect(toggleOption(TACO.modifier_groups, ['small'], 'huge')).toEqual(['small'])
    expect(toggleOption(TACO.modifier_groups, ['small'], 'nope')).toEqual(['small'])
    expect(isBlocked(SIZE, [], SIZE.options[2])).toBe(true)
  })

  it('never blocks a radio option: tapping it replaces the choice', () => {
    expect(isBlocked(SIZE, ['small'], SIZE.options[1])).toBe(false)
  })
})

describe('unitPrice', () => {
  it('adds the chosen options to the item price', () => {
    expect(unitPrice(TACO, [])).toBe(2500)
    expect(unitPrice(TACO, ['large', 'cheese', 'onion'])).toBe(2500 + 1500 + 1000)
  })
})

describe('initialSelection', () => {
  it('starts empty and keeps only options still on sale when editing', () => {
    expect(initialSelection(TACO.modifier_groups)).toEqual([])
    expect(initialSelection(TACO.modifier_groups, ['huge', 'cheese', 'gone'])).toEqual(['cheese'])
  })
})

describe('lineDraftKey with options', () => {
  it('keeps the old key when there are no options', () => {
    expect(lineDraftKey('i1', 2, 'No onion')).toBe(JSON.stringify(['i1', 2, 'No onion']))
    expect(lineDraftKey('i1', 2, 'No onion', [])).toBe(JSON.stringify(['i1', 2, 'No onion']))
  })

  it('gives another selection another key, whatever the order', () => {
    expect(lineDraftKey('i1', 1, '', ['b', 'a'])).toBe(lineDraftKey('i1', 1, '', ['a', 'b']))
    expect(lineDraftKey('i1', 1, '', ['a'])).not.toBe(lineDraftKey('i1', 1, '', ['b']))
    expect(lineDraftKey('i1', 1, '', ['a'])).not.toBe(lineDraftKey('i1', 1, ''))
  })
})

describe('modifierSummary', () => {
  const modifiers = [
    { group: 'Size', name: 'Large', price_cents: 1500 },
    { group: 'Extras', name: 'Cheese', price_cents: 1000 },
    { group: 'Extras', name: 'Avocado', price_cents: 0 },
  ]

  it('lists the options under each group', () => {
    expect(modifierSummary(modifiers)).toBe('Size: Large · Extras: Cheese, Avocado')
    expect(modifierSummary([])).toBe('')
  })

  it('adds the price of each paid option when asked', () => {
    expect(modifierSummary(modifiers, true)).toBe('Size: Large (+$15.00) · Extras: Cheese (+$10.00), Avocado')
  })

  it('labels a dish with its options for one line notices', () => {
    expect(dishLabel('Taco', modifiers)).toBe('Taco (Size: Large · Extras: Cheese, Avocado)')
    expect(dishLabel('Taco', [])).toBe('Taco')
  })
})
