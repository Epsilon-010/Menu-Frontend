import { PlusIcon, XCircleIcon } from '@phosphor-icons/react'
import { useEffect, useState, type FormEvent } from 'react'
import { createDraftIds } from '../../shared/api/idempotency.ts'
import { Button } from '../../shared/ui/Button.tsx'
import { Field, Select, TextInput } from '../../shared/ui/Field.tsx'
import { ErrorText } from '../../shared/ui/Feedback.tsx'
import { useRowAction } from '../../shared/ui/useRowAction.ts'
import { formatMoney } from '../catalog/price.ts'
import { MAX_REASON_LENGTH, rejectReasonError } from '../kitchen/logic.ts'
import { fetchMenu, MAX_NOTE_LENGTH, MAX_QUANTITY, MIN_QUANTITY, OrderingError, type MenuCategory } from '../ordering/api.ts'
import { lineDraftKey } from '../ordering/logic.ts'
import type { NewOrderDish } from './api.ts'
import { dishDraftError } from './logic.ts'

/** "Cancel dish" under a dish the kitchen has not started: asks for the reason the table will see. */
export function CancelDishControl({ onCancel }: { onCancel: (reason: string) => Promise<string | null> }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const { busy, error, run } = useRowAction()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const invalid = rejectReasonError(reason)
    setProblem(invalid)
    if (invalid === null) {
      void run(
        () => onCancel(reason.trim()),
        () => {
          setOpen(false)
          setReason('')
        },
      )
    }
  }

  if (!open) {
    return (
      <Button variant="ghost" icon={<XCircleIcon size={16} aria-hidden />} onClick={() => setOpen(true)}>
        Cancel dish
      </Button>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg bg-red-50 p-3">
      <TextInput
        aria-label="Why is the dish cancelled"
        autoFocus
        maxLength={MAX_REASON_LENGTH}
        placeholder="Reason, like The table changed its mind"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      {(problem ?? error) && <ErrorText>{problem ?? error}</ErrorText>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="danger" disabled={busy}>
          {busy ? 'Cancelling…' : 'Cancel dish'}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
          Keep it
        </Button>
      </div>
    </form>
  )
}

type MenuState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'loaded'; categories: MenuCategory[] }

/** "Add dish" under an order of an open bill: pick an available dish, quantity and note. */
export function AddDishControl({ onAdd }: { onAdd: (dish: NewOrderDish) => Promise<string | null> }) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <Button variant="secondary" icon={<PlusIcon size={16} aria-hidden />} onClick={() => setOpen(true)}>
        Add dish
      </Button>
    )
  }
  return <AddDishForm onAdd={onAdd} onClose={() => setOpen(false)} />
}

function AddDishForm({ onAdd, onClose }: { onAdd: (dish: NewOrderDish) => Promise<string | null>; onClose: () => void }) {
  const [menu, setMenu] = useState<MenuState>({ status: 'loading' })
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [note, setNote] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  // One client id per distinct dish: a retry after a lost answer never adds it twice.
  const [drafts] = useState(() => createDraftIds())
  const { busy, error, run } = useRowAction()

  useEffect(() => {
    let active = true
    fetchMenu()
      .then((categories) => {
        if (active) setMenu({ status: 'loaded', categories })
      })
      .catch((caught: unknown) => {
        if (!active) return
        const message = caught instanceof OrderingError ? caught.message : 'Could not load the menu. Please try again.'
        setMenu({ status: 'error', message })
      })
    return () => {
      active = false
    }
  }, [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const count = Number(quantity)
    const invalid = dishDraftError(itemId, count, note)
    setProblem(invalid)
    if (invalid !== null) return
    const id = drafts.idFor(lineDraftKey(itemId, count, note))
    void run(
      () => onAdd({ id, item_id: itemId, quantity: count, note }),
      () => {
        drafts.reset()
        onClose()
      },
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl bg-zinc-50 p-3">
      {menu.status === 'loading' && <p className="text-sm text-zinc-500">Loading the menu…</p>}
      {menu.status === 'error' && <ErrorText>{menu.message}</ErrorText>}
      {menu.status === 'loaded' && (
        <>
          <Field label="Dish">
            <Select value={itemId} onChange={(event) => setItemId(event.target.value)}>
              <option value="">Choose a dish</option>
              {menu.categories.map((category) => (
                <optgroup key={category.id} label={category.name}>
                  {category.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {formatMoney(item.price_cents)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <div className="flex flex-wrap gap-3">
            <Field label="Quantity" className="w-24">
              <TextInput
                type="number"
                min={MIN_QUANTITY}
                max={MAX_QUANTITY}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </Field>
            <Field label="Note (optional)" className="min-w-0 flex-1">
              <TextInput
                maxLength={MAX_NOTE_LENGTH}
                placeholder="Like No onion"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
          </div>
        </>
      )}
      {(problem ?? error) && <ErrorText>{problem ?? error}</ErrorText>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={busy || menu.status !== 'loaded'}>
          {busy ? 'Adding…' : 'Add to order'}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
