/** Pure rules of the modifier group editor; the server applies the same ones (422 when broken). */
import { formatPrice, MAX_PRICE_CENTS, parsePrice } from '../catalog/price.ts'
import type { ModifierGroup, ModifierGroupDraft, ModifierOptionDraft } from './api.ts'

export const MAX_NAME_LENGTH = 80
export const MAX_OPTIONS = 30

/** One option row as typed in the editor; `key` is stable for React, `id` only for saved options. */
export interface OptionRow {
  key: string
  id?: string
  name: string
  /** As typed, like the item price ("5" or "5.50"); empty means free. */
  price: string
  is_available: boolean
}

export interface GroupForm {
  name: string
  min_select: string
  max_select: string
  options: OptionRow[]
}

export type GroupPayload = Omit<ModifierGroupDraft, 'id'>

/** The selection rule of a group in plain words. */
export function selectionRule(min: number, max: number): string {
  if (min === max) return `Required · choose ${min}`
  if (min === 0) return `Optional · up to ${max}`
  return `Choose ${min} to ${max}`
}

function newKey(): string {
  return crypto.randomUUID()
}

export function blankOption(key: string = newKey()): OptionRow {
  return { key, name: '', price: '', is_available: true }
}

/** The editor state for a saved group, or for a new one (required, choose 1, one blank option). */
export function formFromGroup(group?: ModifierGroup, makeKey: () => string = newKey): GroupForm {
  if (!group) return { name: '', min_select: '1', max_select: '1', options: [blankOption(makeKey())] }
  return {
    name: group.name,
    min_select: String(group.min_select),
    max_select: String(group.max_select),
    options: group.options.map((option) => ({
      key: option.id,
      id: option.id,
      name: option.name,
      price: formatPrice(option.price_cents),
      is_available: option.is_available,
    })),
  }
}

const WHOLE_NUMBER = /^\d{1,3}$/

function limit(text: string): number | null {
  const trimmed = text.trim()
  return WHOLE_NUMBER.test(trimmed) ? Number(trimmed) : null
}

/** The limits when `0 <= min <= max` and `1 <= max <= number of options`, else null. */
export function parseLimits(form: GroupForm): { min: number; max: number } | null {
  const min = limit(form.min_select)
  const max = limit(form.max_select)
  if (min === null || max === null || min > max || max < 1 || max > form.options.length) return null
  return { min, max }
}

/** The body to save (create or the full PATCH), or the first rule the form breaks. */
export function groupPayload(form: GroupForm): { payload: GroupPayload } | { error: string } {
  const name = form.name.trim()
  if (name === '') return { error: 'Give the group a name, like Size or Extras.' }
  if (name.length > MAX_NAME_LENGTH) return { error: `The group name can have up to ${MAX_NAME_LENGTH} characters.` }
  if (form.options.length === 0) return { error: 'Add at least one option.' }
  if (form.options.length > MAX_OPTIONS) return { error: `A group can have up to ${MAX_OPTIONS} options.` }

  const options: ModifierOptionDraft[] = []
  const seen = new Set<string>()
  for (const row of form.options) {
    const optionName = row.name.trim()
    if (optionName === '') return { error: 'Give every option a name.' }
    if (optionName.length > MAX_NAME_LENGTH) return { error: `Option names can have up to ${MAX_NAME_LENGTH} characters.` }
    const folded = optionName.toLowerCase()
    if (seen.has(folded)) return { error: 'Option names must be unique in a group.' }
    seen.add(folded)
    const priceCents = row.price.trim() === '' ? 0 : parsePrice(row.price)
    if (priceCents === null) {
      return { error: `Enter a price from 0 to ${formatPrice(MAX_PRICE_CENTS)} for ${optionName}, like 5 or 5.50.` }
    }
    options.push({ ...(row.id ? { id: row.id } : {}), name: optionName, price_cents: priceCents, is_available: row.is_available })
  }

  const limits = parseLimits(form)
  if (limits === null) {
    return {
      error: `Invalid selection limits. The minimum goes from 0 to the maximum, and the maximum from 1 to ${options.length} (the number of options).`,
    }
  }
  return { payload: { name, min_select: limits.min, max_select: limits.max, options } }
}

/** The list with the row at `index` moved one place; moves past the ends change nothing. */
export function moveRow<T>(rows: readonly T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta
  const next = [...rows]
  if (index < 0 || index >= rows.length || target < 0 || target >= rows.length) return next
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

/** Ticks or unticks `value`, keeping the picks in the order of `all`, once each (badges, modifier groups). */
export function pickInOrder<T>(all: readonly T[], current: readonly T[], value: T, checked: boolean): T[] {
  return all.filter((each) => (each === value ? checked : current.includes(each)))
}
