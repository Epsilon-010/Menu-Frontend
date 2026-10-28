import { BowlFoodIcon, MinusIcon, PlusIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Button, IconButton } from '../../shared/ui/Button.tsx'
import { MOTION } from '../../shared/ui/classes.ts'
import { Field, TextInput } from '../../shared/ui/Field.tsx'
import { EmptyState, ErrorText } from '../../shared/ui/Feedback.tsx'
import { formatMoney } from '../catalog/price.ts'
import { MAX_NOTE_LENGTH, MAX_QUANTITY, MIN_QUANTITY, type MenuCategory, type MenuItem } from './api.ts'

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  /** What is being counted, for screen readers ("Tacos al pastor"). */
  label: string
}

export function QuantityStepper({ value, onChange, disabled = false, label }: QuantityStepperProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1">
      <IconButton
        label={`One less ${label}`}
        icon={<MinusIcon size={16} />}
        disabled={disabled || value <= MIN_QUANTITY}
        onClick={() => onChange(value - 1)}
        className="p-1"
      />
      <span aria-live="polite" className="min-w-8 text-center text-sm font-semibold text-zinc-950 tabular-nums">
        {value}
      </span>
      <IconButton
        label={`One more ${label}`}
        icon={<PlusIcon size={16} />}
        disabled={disabled || value >= MAX_QUANTITY}
        onClick={() => onChange(value + 1)}
        className="p-1"
      />
    </div>
  )
}

interface ItemCardProps {
  item: MenuItem
  onAdd: (quantity: number, note: string) => Promise<string | null>
}

function ItemCard({ item, onAdd }: ItemCardProps) {
  const [adding, setAdding] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const image = item.image?.card_url ?? null

  function close() {
    setAdding(false)
    setQuantity(1)
    setNote('')
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const failure = await onAdd(quantity, note)
    setBusy(false)
    if (failure === null) close()
    else setError(failure)
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      {image && (
        <img src={image} alt={item.name} loading="lazy" className="aspect-[4/3] w-full bg-zinc-100 object-cover" />
      )}
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-semibold text-pretty text-zinc-950">{item.name}</h3>
            <p className="shrink-0 font-semibold text-zinc-950 tabular-nums">{formatMoney(item.price_cents)}</p>
          </div>
          {item.description && <p className="line-clamp-3 text-sm text-pretty text-zinc-500">{item.description}</p>}
        </div>

        {adding ? (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-zinc-50 p-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-zinc-700">How many</span>
              <QuantityStepper value={quantity} onChange={setQuantity} disabled={busy} label={item.name} />
            </div>
            <Field label="Note for the kitchen (optional)">
              <TextInput
                maxLength={MAX_NOTE_LENGTH}
                placeholder="No onion, extra salsa"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={busy}
              />
            </Field>
            {error && <ErrorText>{error}</ErrorText>}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={busy} className="flex-1">
                {busy ? 'Adding…' : `Add ${quantity} · ${formatMoney(item.price_cents * quantity)}`}
              </Button>
              <Button variant="ghost" disabled={busy} onClick={close}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="secondary" icon={<PlusIcon size={16} aria-hidden />} onClick={() => setAdding(true)}>
            Add
          </Button>
        )}
      </div>
    </article>
  )
}

interface MenuBrowserProps {
  categories: MenuCategory[]
  onAdd: (itemId: string, quantity: number, note: string) => Promise<string | null>
}

function sectionId(categoryId: string): string {
  return `category-${categoryId}`
}

/** The menu: category chips that jump to each section, and the item cards with their add form. */
export function MenuBrowser({ categories, onAdd }: MenuBrowserProps) {
  const withItems = categories.filter((category) => category.items.length > 0)
  if (withItems.length === 0) {
    return (
      <EmptyState icon={<BowlFoodIcon size={24} aria-hidden />} title="The menu is being prepared">
        There is nothing to order yet. Ask your waiter for help in the meantime.
      </EmptyState>
    )
  }

  return (
    <div className="space-y-8">
      <nav aria-label="Menu categories" className="sticky top-20 z-20 -mx-4 overflow-x-auto px-4 py-2 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-2">
          {withItems.map((category) => (
            <li key={category.id}>
              <a
                href={`#${sectionId(category.id)}`}
                className={`inline-flex rounded-lg border border-zinc-200 bg-white/90 px-3 py-2 text-sm font-semibold text-zinc-700 backdrop-blur-md hover:bg-zinc-100 hover:text-zinc-950 active:scale-[0.98] ${MOTION}`}
              >
                {category.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {withItems.map((category) => (
        <section key={category.id} id={sectionId(category.id)} className="scroll-mt-32 space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">{category.name}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {category.items.map((item) => (
              <ItemCard key={item.id} item={item} onAdd={(quantity, note) => onAdd(item.id, quantity, note)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
