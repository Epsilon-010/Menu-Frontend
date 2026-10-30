import { useState, type FormEvent } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { Field, TextArea, TextInput } from '../../shared/ui/Field.tsx'
import { ErrorText } from '../../shared/ui/Feedback.tsx'
import { BADGE_LABELS, BADGES, type Badge } from './badges.ts'
import { CURRENCY_SYMBOL, formatPrice, MAX_PRICE_CENTS, parsePrice } from './price.ts'

export interface ItemFormValues {
  name: string
  description: string
  price_cents: number
  badges: Badge[]
}

interface ItemFormProps {
  initial?: ItemFormValues
  submitLabel: string
  /** Resolve to an error message, or null on success. */
  onSubmit: (values: ItemFormValues) => Promise<string | null>
  onCancel: () => void
}

export function ItemForm({ initial, submitLabel, onSubmit, onCancel }: ItemFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [price, setPrice] = useState(initial ? formatPrice(initial.price_cents) : '')
  const [badges, setBadges] = useState<Badge[]>(initial?.badges ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const priceCents = parsePrice(price)
    if (priceCents === null) {
      setError(`Enter a price from 0 to ${formatPrice(MAX_PRICE_CENTS)}, like 25 or 25.50.`)
      return
    }
    setBusy(true)
    const failure = await onSubmit({ name, description, price_cents: priceCents, badges })
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
                  setBadges((current) =>
                    // Kept in the fixed order, once each, like the server stores them.
                    BADGES.filter((each) => (each === badge ? event.target.checked : current.includes(each))),
                  )
                }
                className="h-4 w-4 accent-zinc-950"
              />
              {BADGE_LABELS[badge]}
            </label>
          ))}
        </div>
      </fieldset>
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
