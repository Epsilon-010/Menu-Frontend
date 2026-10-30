/** Pure rules of choosing an item's options, kept apart from React so they can be tested on their own. */
import { formatMoney } from '../catalog/price.ts'
import type { MenuItem, ModifierGroup, ModifierOption } from './api.ts'

function options(count: number): string {
  return count === 1 ? 'option' : 'options'
}

/** The rule of a group in the server's words: "Choose 1 option for Size", "Choose up to 3 options for Extras". */
export function ruleMessage(group: Pick<ModifierGroup, 'name' | 'min_select' | 'max_select'>): string {
  const { name, min_select: min, max_select: max } = group
  if (min === max) return `Choose ${min} ${options(min)} for ${name}`
  if (min === 0) return `Choose up to ${max} ${options(max)} for ${name}`
  return `Choose between ${min} and ${max} options for ${name}`
}

/** Short hint beside the group name in the picker. */
export function groupHint(group: Pick<ModifierGroup, 'min_select' | 'max_select'>): string {
  const { min_select: min, max_select: max } = group
  if (min === max) return `Choose ${min}`
  if (min === 0) return `Optional, up to ${max}`
  return `Choose ${min} to ${max}`
}

/** A group of one is a radio group: picking an option replaces the previous one. */
export function isSingleChoice(group: Pick<ModifierGroup, 'max_select'>): boolean {
  return group.max_select === 1
}

function chosenIn(group: ModifierGroup, selected: readonly string[]): ModifierOption[] {
  const picked = new Set(selected)
  return group.options.filter((option) => option.available && picked.has(option.id))
}

/** The first rule the selection does not meet, in the item's group order; null when it can be added. */
export function selectionError(groups: ModifierGroup[], selected: readonly string[]): string | null {
  for (const group of groups) {
    const count = chosenIn(group, selected).length
    if (count < group.min_select || count > group.max_select) return ruleMessage(group)
  }
  return null
}

/** A sold out option, or another checkbox once the group is full, cannot be picked. */
export function isBlocked(group: ModifierGroup, selected: readonly string[], option: ModifierOption): boolean {
  if (!option.available) return true
  if (isSingleChoice(group) || selected.includes(option.id)) return false
  return chosenIn(group, selected).length >= group.max_select
}

/** The selection after tapping `optionId`; unchanged when that option cannot be picked. */
export function toggleOption(groups: ModifierGroup[], selected: readonly string[], optionId: string): string[] {
  const group = groups.find((each) => each.options.some((option) => option.id === optionId))
  const option = group?.options.find((each) => each.id === optionId)
  if (!group || !option || !option.available) return [...selected]
  if (selected.includes(optionId)) {
    // A required radio choice stays chosen: tapping it again does nothing.
    if (isSingleChoice(group) && group.min_select > 0) return [...selected]
    return selected.filter((id) => id !== optionId)
  }
  if (isSingleChoice(group)) {
    const others = new Set(group.options.map((each) => each.id))
    return [...selected.filter((id) => !others.has(id)), optionId]
  }
  if (isBlocked(group, selected, option)) return [...selected]
  return [...selected, optionId]
}

/** Where a selection starts: empty for a new add; when editing a line, the options still on sale. */
export function initialSelection(groups: ModifierGroup[], current: readonly string[] = []): string[] {
  const onSale = new Set(groups.flatMap((group) => group.options.filter((option) => option.available).map((option) => option.id)))
  return current.filter((id) => onSale.has(id))
}

/** Price of one unit with the chosen options, as the server will compute it. */
export function unitPrice(item: Pick<MenuItem, 'price_cents' | 'modifier_groups'>, selected: readonly string[]): number {
  return item.modifier_groups.reduce(
    (total, group) => total + chosenIn(group, selected).reduce((sum, option) => sum + option.price_cents, 0),
    item.price_cents,
  )
}

/** "Size: Large · Extras: Cheese, Avocado"; with prices, paid options read "Cheese (+$10.00)". */
export function modifierSummary(
  modifiers: readonly { group: string; name: string; price_cents?: number }[],
  withPrices = false,
): string {
  const groups = new Map<string, string[]>()
  for (const modifier of modifiers) {
    const price = withPrices && modifier.price_cents ? ` (+${formatMoney(modifier.price_cents)})` : ''
    const names = groups.get(modifier.group) ?? []
    names.push(`${modifier.name}${price}`)
    groups.set(modifier.group, names)
  }
  return [...groups].map(([group, names]) => `${group}: ${names.join(', ')}`).join(' · ')
}

/** A dish with its options on one line, like "Taco (Size: Large)". */
export function dishLabel(name: string, modifiers: readonly { group: string; name: string }[]): string {
  const summary = modifierSummary(modifiers)
  return summary ? `${name} (${summary})` : name
}
