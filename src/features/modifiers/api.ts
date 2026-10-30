import { alreadyGoneIsDone, json, send } from '../catalog/api.ts'

export interface ModifierOption {
  id: string
  name: string
  /** Integer cents, zero or more. */
  price_cents: number
  is_available: boolean
}

/** A reusable group of options (Size, Extras...) that any item of the tenant can use. */
export interface ModifierGroup {
  id: string
  name: string
  min_select: number
  max_select: number
  options: ModifierOption[]
}

/** An option to save: one with the id of an option of the group keeps it; one without id is new. */
export interface ModifierOptionDraft {
  id?: string
  name: string
  price_cents: number
  is_available: boolean
}

export interface ModifierGroupDraft {
  /** Chosen by the client and kept until the create succeeds: a repeat returns the same group. */
  id?: string
  name: string
  min_select: number
  max_select: number
  options: ModifierOptionDraft[]
}

/** `options`, when sent, is the full new list in order: options left out are deleted. */
export type ModifierGroupChanges = Partial<Omit<ModifierGroupDraft, 'id'>>

const PATH = '/catalog/modifier-groups'

/** The tenant's library, by name, each group with its options in order. */
export async function listModifierGroups(): Promise<ModifierGroup[]> {
  return (await (await send(PATH)).json()) as ModifierGroup[]
}

export async function createModifierGroup(draft: ModifierGroupDraft): Promise<ModifierGroup> {
  return (await (await send(PATH, json('POST', draft))).json()) as ModifierGroup
}

export async function updateModifierGroup(id: string, changes: ModifierGroupChanges): Promise<ModifierGroup> {
  return (await (await send(`${PATH}/${id}`, json('PATCH', changes))).json()) as ModifierGroup
}

/** Also detaches the group from every item that used it. */
export async function deleteModifierGroup(id: string): Promise<void> {
  await alreadyGoneIsDone(send(`${PATH}/${id}`, { method: 'DELETE' }))
}
