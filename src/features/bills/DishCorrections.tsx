import { PlusIcon, XCircleIcon } from '@phosphor-icons/react'
import { useEffect, useId, useState, type FormEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog.tsx'
import { Label } from '../../components/ui/label.tsx'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select.tsx'
import { createDraftIds } from '../../shared/api/idempotency.ts'
import { Button } from '../../shared/ui/Button.tsx'
import { Field, TextInput } from '../../shared/ui/Field.tsx'
import { ErrorText } from '../../shared/ui/Feedback.tsx'
import { useRowAction } from '../../shared/ui/useRowAction.ts'
import { formatMoney } from '../catalog/price.ts'
import { MAX_REASON_LENGTH, rejectReasonError } from '../kitchen/logic.ts'
import { fetchMenu, MAX_NOTE_LENGTH, MAX_QUANTITY, MIN_QUANTITY, OrderingError, type MenuCategory } from '../ordering/api.ts'
import { lineDraftKey } from '../ordering/logic.ts'
import { ModifierPicker } from '../ordering/ModifierPicker.tsx'
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

  return (
    <>
      <Button
        variant="ghost"
        className="min-h-11 text-red-700 hover:bg-red-50 hover:text-red-800"
        icon={<XCircleIcon size={16} aria-hidden />}
        onClick={() => setOpen(true)}
      >
        Cancelar platillo
      </Button>
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent>
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>¿Cancelar este platillo?</DialogTitle>
              <DialogDescription>La mesa ve el motivo. Solo se cancelan los platillos que la cocina aún no empieza.</DialogDescription>
            </DialogHeader>
            <TextInput
              aria-label="Motivo de la cancelación"
              autoFocus
              maxLength={MAX_REASON_LENGTH}
              placeholder="Motivo, por ejemplo: La mesa cambió de opinión"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            {(problem ?? error) && <ErrorText>{problem ?? error}</ErrorText>}
            <DialogFooter>
              <Button variant="ghost" size="md" className="min-h-11" disabled={busy} onClick={() => setOpen(false)}>
                Conservarlo
              </Button>
              <Button type="submit" variant="danger" size="md" className="min-h-11" disabled={busy}>
                {busy ? 'Cancelando…' : 'Cancelar platillo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

type MenuState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'loaded'; categories: MenuCategory[] }

/** "Add dish" under an order of an open bill: pick an available dish, quantity and note. */
export function AddDishControl({ onAdd }: { onAdd: (dish: NewOrderDish) => Promise<string | null> }) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <Button variant="secondary" className="min-h-11" icon={<PlusIcon size={16} aria-hidden />} onClick={() => setOpen(true)}>
        Agregar platillo
      </Button>
    )
  }
  return <AddDishForm onAdd={onAdd} onClose={() => setOpen(false)} />
}

function AddDishForm({ onAdd, onClose }: { onAdd: (dish: NewOrderDish) => Promise<string | null>; onClose: () => void }) {
  const [menu, setMenu] = useState<MenuState>({ status: 'loading' })
  const [itemId, setItemId] = useState('')
  // The chosen options of the chosen dish; picking another dish starts them over.
  const [selected, setSelected] = useState<string[]>([])
  const [quantity, setQuantity] = useState('1')
  const [note, setNote] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  // One client id per distinct dish: a retry after a lost answer never adds it twice.
  const [drafts] = useState(() => createDraftIds())
  const { busy, error, run } = useRowAction()
  const ids = useId()

  useEffect(() => {
    let active = true
    fetchMenu()
      .then((categories) => {
        if (active) setMenu({ status: 'loaded', categories })
      })
      .catch((caught: unknown) => {
        if (!active) return
        const message = caught instanceof OrderingError ? caught.message : 'No se pudo cargar el menú. Inténtalo de nuevo.'
        setMenu({ status: 'error', message })
      })
    return () => {
      active = false
    }
  }, [])

  const item =
    menu.status === 'loaded'
      ? menu.categories.flatMap((category) => category.items).find((each) => each.id === itemId)
      : undefined
  const groups = item?.modifier_groups ?? []

  function chooseDish(id: string) {
    setItemId(id)
    setSelected([])
    setProblem(null)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const count = Number(quantity)
    const invalid = dishDraftError(itemId, count, note, groups, selected)
    setProblem(invalid)
    if (invalid !== null) return
    const id = drafts.idFor(lineDraftKey(itemId, count, note, selected))
    void run(
      () => onAdd({ id, item_id: itemId, quantity: count, note, modifier_option_ids: selected }),
      () => {
        drafts.reset()
        onClose()
      },
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-line bg-canvas p-3">
      {menu.status === 'loading' && <p className="text-sm text-muted">Cargando el menú…</p>}
      {menu.status === 'error' && <ErrorText>{menu.message}</ErrorText>}
      {menu.status === 'loaded' && (
        <>
          <div className="space-y-2">
            <Label htmlFor={`${ids}-dish`}>Platillo</Label>
            <Select value={itemId} onValueChange={chooseDish}>
              <SelectTrigger id={`${ids}-dish`} className="min-h-11">
                <SelectValue placeholder="Elige un platillo" />
              </SelectTrigger>
              <SelectContent>
                {menu.categories.map((category) => (
                  <SelectGroup key={category.id}>
                    <SelectLabel>{category.name}</SelectLabel>
                    {category.items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} · {formatMoney(item.price_cents)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          {groups.length > 0 && <ModifierPicker groups={groups} selected={selected} onChange={setSelected} disabled={busy} />}
          <div className="flex flex-wrap gap-3">
            <Field label="Cantidad" className="w-24">
              <TextInput
                type="number"
                min={MIN_QUANTITY}
                max={MAX_QUANTITY}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </Field>
            <Field label="Nota (opcional)" className="min-w-0 flex-1">
              <TextInput
                maxLength={MAX_NOTE_LENGTH}
                placeholder="Por ejemplo: Sin cebolla"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
          </div>
        </>
      )}
      {(problem ?? error) && <ErrorText>{problem ?? error}</ErrorText>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" className="min-h-11" disabled={busy || menu.status !== 'loaded'}>
          {busy ? 'Agregando…' : 'Agregar a la orden'}
        </Button>
        <Button variant="ghost" className="min-h-11" disabled={busy} onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
