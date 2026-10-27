import { useState, type FormEvent } from 'react'
import { formatPrice, parsePrice } from './price.ts'
import { BUTTON, INPUT, PRIMARY_BUTTON } from './styles.ts'

export interface ItemFormValues {
  name: string
  description: string
  price_cents: number
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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const priceCents = parsePrice(price)
    if (priceCents === null) {
      setError('Enter a price like 25 or 25.50.')
      return
    }
    setBusy(true)
    const failure = await onSubmit({ name, description, price_cents: priceCents })
    setBusy(false)
    setError(failure)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg bg-slate-50 p-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <label className="space-y-1">
          <span className="text-sm text-slate-700">Name</span>
          <input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-slate-700">Price</span>
          <input
            required
            inputMode="decimal"
            placeholder="25.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={INPUT}
          />
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-sm text-slate-700">Description (optional)</span>
        <textarea
          maxLength={500}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={INPUT}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={PRIMARY_BUTTON}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button type="button" disabled={busy} onClick={onCancel} className={BUTTON}>
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  )
}
