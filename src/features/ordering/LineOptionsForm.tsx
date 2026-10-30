import { useState, type FormEvent } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { ErrorText } from '../../shared/ui/Feedback.tsx'
import { formatMoney } from '../catalog/price.ts'
import type { CartLine, MenuItem } from './api.ts'
import { ModifierPicker } from './ModifierPicker.tsx'
import { initialSelection, selectionError, unitPrice } from './modifiers.ts'

interface LineOptionsFormProps {
  item: MenuItem
  line: CartLine
  /** Saves the new selection; resolves to an error message, or null when it was saved. */
  onSave: (optionIds: string[]) => Promise<string | null>
  onClose: () => void
}

/** Reopens the options of a cart line with its current choice (the options still on sale). */
export function LineOptionsForm({ item, line, onSave, onClose }: LineOptionsFormProps) {
  const groups = item.modifier_groups
  const [selected, setSelected] = useState<string[]>(() =>
    initialSelection(
      groups,
      line.modifiers.map((modifier) => modifier.option_id),
    ),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unmet = selectionError(groups, selected)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (unmet !== null) return
    setBusy(true)
    const failure = await onSave(selected)
    setBusy(false)
    if (failure === null) onClose()
    else setError(failure)
  }

  return (
    <form onSubmit={handleSubmit} aria-label={`Options of ${line.name}`} className="space-y-4 rounded-xl bg-canvas p-3">
      <ModifierPicker groups={groups} selected={selected} onChange={setSelected} disabled={busy} />
      {unmet && <p className="text-sm text-muted">{unmet}</p>}
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={busy || unmet !== null} className="type-button flex-1">
          {busy ? 'Saving…' : `Save · ${formatMoney(unitPrice(item, selected) * line.quantity)}`}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onClose} className="type-button">
          Cancel
        </Button>
      </div>
    </form>
  )
}
