import { useState, type FormEvent } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { Field, TextInput } from '../../shared/ui/Field.tsx'
import { ErrorText } from '../../shared/ui/Feedback.tsx'
import { formatMoney } from '../catalog/price.ts'
import { MAX_NOTE_LENGTH, type MenuItem } from './api.ts'
import { ModifierPicker } from './ModifierPicker.tsx'
import { initialSelection as startingSelection, selectionError, unitPrice } from './modifiers.ts'
import { QuantityStepper } from './QuantityStepper.tsx'

interface AddLineFormProps {
  item: MenuItem
  /** Resolves to an error message, or null when the line was added. */
  onAdd: (quantity: number, note: string, optionIds: string[]) => Promise<string | null>
  /** Closes the form (after adding, or on Cancel). */
  onDone: () => void
  /** Options already chosen when the form opens (none by default). */
  initialSelection?: string[]
}

/** The add form of a menu card: the item's options (when it has some), how many, a note and the live total. */
export function AddLineForm({ item, onAdd, onDone, initialSelection = [] }: AddLineFormProps) {
  const groups = item.modifier_groups
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [selected, setSelected] = useState<string[]>(() => startingSelection(groups, initialSelection))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unmet = selectionError(groups, selected)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (unmet !== null) return
    setBusy(true)
    const failure = await onAdd(quantity, note, selected)
    setBusy(false)
    if (failure === null) onDone()
    else setError(failure)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-canvas p-3">
      {groups.length > 0 && <ModifierPicker groups={groups} selected={selected} onChange={setSelected} disabled={busy} />}
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-ink-soft">How many</span>
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
      {unmet && <p className="text-sm text-muted">{unmet}</p>}
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={busy || unmet !== null} className="type-button flex-1">
          {busy ? 'Adding…' : `Add ${quantity} · ${formatMoney(unitPrice(item, selected) * quantity)}`}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onDone} className="type-button">
          Cancel
        </Button>
      </div>
    </form>
  )
}
