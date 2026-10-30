import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '../../shared/ui/Button.tsx'
import { Field, TextArea, TextInput } from '../../shared/ui/Field.tsx'
import { ErrorText } from '../../shared/ui/Feedback.tsx'
import type { ModifierGroup } from '../modifiers/api.ts'
import { groupsToSave, pickInOrder, selectionRule } from '../modifiers/logic.ts'
import { BADGE_LABELS, BADGES, type Badge } from './badges.ts'
import { CURRENCY_SYMBOL, formatPrice, MAX_PRICE_CENTS, parsePrice } from './price.ts'

export interface ItemFormValues {
  name: string
  description: string
  price_cents: number
  badges: Badge[]
  /** In the order of the library, like the picker shows them. */
  modifier_group_ids: string[]
}

interface ItemFormProps {
  initial?: ItemFormValues
  /** The tenant's modifier group library, or null when it could not load. */
  modifierGroups: ModifierGroup[] | null
  submitLabel: string
  /** Resolve to an error message, or null on success. */
  onSubmit: (values: ItemFormValues) => Promise<string | null>
  onCancel: () => void
}

export function ItemForm({ initial, modifierGroups, submitLabel, onSubmit, onCancel }: ItemFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [price, setPrice] = useState(initial ? formatPrice(initial.price_cents) : '')
  const [badges, setBadges] = useState<Badge[]>(initial?.badges ?? [])
  const [groupIds, setGroupIds] = useState<string[]>(initial?.modifier_group_ids ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const priceCents = parsePrice(price)
    if (priceCents === null) {
      setError(`Enter a price from 0 to ${formatPrice(MAX_PRICE_CENTS)}, like 25 or 25.50.`)
      return
    }
    const modifierGroupIds = groupsToSave(modifierGroups, groupIds)
    setBusy(true)
    const failure = await onSubmit({ name, description, price_cents: priceCents, badges, modifier_group_ids: modifierGroupIds })
    setBusy(false)
    setError(failure)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-zinc-50 p-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field label="Name">
          <TextInput required maxLength={80} placeholder="Taco al pastor" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Price">
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-400">
              {CURRENCY_SYMBOL}
            </span>
            <TextInput
              required
              inputMode="decimal"
              placeholder="25.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="pl-6 font-mono"
            />
          </div>
        </Field>
      </div>
      <Field label="Description" hint="Optional. Up to 500 characters.">
        <TextArea
          maxLength={500}
          rows={2}
          placeholder="Pork marinated with achiote, pineapple, onion and cilantro"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink-soft">Badges (optional)</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {BADGES.map((badge) => (
            <label key={badge} className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={badges.includes(badge)}
                onChange={(event) =>
                  // Kept in the fixed order, once each, like the server stores them.
                  setBadges((current) => pickInOrder(BADGES, current, badge, event.target.checked))
                }
                className="h-4 w-4 accent-zinc-950"
              />
              {BADGE_LABELS[badge]}
            </label>
          ))}
        </div>
      </fieldset>
      <ModifierGroupPicker
        library={modifierGroups}
        selected={groupIds}
        onToggle={(id, checked) =>
          setGroupIds((current) => pickInOrder(modifierGroups?.map((group) => group.id) ?? current, current, id, checked))
        }
      />
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

interface ModifierGroupPickerProps {
  library: ModifierGroup[] | null
  selected: string[]
  onToggle: (id: string, checked: boolean) => void
}

/** Checkboxes for the library's groups, in library order, each with its selection rule. */
function ModifierGroupPicker({ library, selected, onToggle }: ModifierGroupPickerProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-ink-soft">Modifier groups (optional)</legend>
      {library === null ? (
        <p className="text-sm text-muted">Modifier groups could not load. Saving keeps the groups this item already has.</p>
      ) : library.length === 0 ? (
        <p className="text-sm text-muted">
          No modifier groups yet.{' '}
          <Link to="/admin/modifiers" className="font-medium text-ink underline underline-offset-4 hover:text-ink-soft">
            Create sizes or extras
          </Link>{' '}
          to let guests choose them on this item.
        </p>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {library.map((group) => (
            <label key={group.id} className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={selected.includes(group.id)}
                onChange={(event) => onToggle(group.id, event.target.checked)}
                className="h-4 w-4 accent-zinc-950"
              />
              {group.name}
              <span className="text-xs text-muted">{selectionRule(group.min_select, group.max_select)}</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  )
}
