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
      setError(`Escribe un precio de 0 a ${formatPrice(MAX_PRICE_CENTS)}, como 25 o 25.50.`)
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
        <Field label="Nombre">
          <TextInput required maxLength={80} placeholder="Taco al pastor" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Precio">
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
      <Field label="Descripción" hint="Opcional. Hasta 500 caracteres.">
        <TextArea
          maxLength={500}
          rows={2}
          placeholder="Cerdo marinado con achiote, piña, cebolla y cilantro"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink-soft">Etiquetas (opcional)</legend>
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
          {busy ? 'Guardando…' : submitLabel}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onCancel}>
          Cancelar
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
      <legend className="text-sm font-medium text-ink-soft">Grupos de opciones (opcional)</legend>
      {library === null ? (
        <p className="text-sm text-muted">No se pudieron cargar los grupos de opciones. Al guardar, el producto conserva los grupos que ya tiene.</p>
      ) : library.length === 0 ? (
        <p className="text-sm text-muted">
          Aún no hay grupos de opciones.{' '}
          <Link to="/admin/modifiers" className="font-medium text-ink underline underline-offset-4 hover:text-ink-soft">
            Crea tamaños o extras
          </Link>{' '}
          para que los comensales los elijan en este producto.
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
