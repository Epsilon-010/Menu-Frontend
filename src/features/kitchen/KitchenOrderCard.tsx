import { CheckIcon, CheckSquareIcon, FireIcon, ProhibitIcon, SquareIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog.tsx'
import { cn } from '../../lib/utils.ts'
import { Button } from '../../shared/ui/Button.tsx'
import { MOTION } from '../../shared/ui/classes.ts'
import { TextInput } from '../../shared/ui/Field.tsx'
import { ErrorText } from '../../shared/ui/Feedback.tsx'
import { useRowAction } from '../../shared/ui/useRowAction.ts'
import type { ItemTarget, StaffOrder } from './api.ts'
import { isPending, kitchenActions, MAX_REASON_LENGTH, pendingSelection, rejectReasonError } from './logic.ts'
import { modifierSummary } from '../ordering/modifiers.ts'
import { OrderTicketHeader } from './OrderTicketHeader.tsx'
import { StatusBadge } from './StatusBadge.tsx'

interface KitchenOrderCardProps {
  order: StaffOrder
  now: number
  late: boolean
  /** Resolves to an error message, or null when the dishes moved. */
  onAct: (itemIds: string[], target: ItemTarget, reason?: string) => Promise<string | null>
}

/** Big enough to hit with a busy hand on a kitchen tablet (at least 48px high). */
const ACTION = 'min-h-12'

/** One ticket for the kitchen: its dishes, how long it has waited, and what to do with the selected dishes. */
export function KitchenOrderCard({ order, now, late, onAct }: KitchenOrderCardProps) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const { busy, error, run } = useRowAction()

  // Dishes another cook moved meanwhile drop out of the selection on their own.
  const chosen = pendingSelection(selected, order)
  const actions = kitchenActions(chosen)
  const pending = order.items.filter(isPending)
  const allChosen = pending.length > 0 && chosen.length === pending.length

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function reset() {
    setSelected(new Set())
    setRejecting(false)
    setReason('')
    setReasonError(null)
  }

  function move(target: ItemTarget, why?: string) {
    void run(() => onAct(chosen.map((item) => item.id), target, why), reset)
  }

  function submitReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const problem = rejectReasonError(reason)
    setReasonError(problem)
    if (problem === null) move('cancelled', reason.trim())
  }

  const count = chosen.length > 0 ? ` ${chosen.length}` : ''

  return (
    <article
      aria-busy={busy}
      aria-label={`Orden ${order.number}, ${order.table_name}`}
      className={cn(
        'flex flex-col gap-4 rounded-2xl border bg-surface p-4 shadow-xs sm:p-6',
        late ? 'border-red-300 ring-2 ring-red-200' : 'border-line',
      )}
    >
      <OrderTicketHeader order={order} now={now} late={late} size="large" />

      <ul className="space-y-2">
        {order.items.map((item) => {
          const selectable = isPending(item)
          const checked = selectable && selected.has(item.id)
          return (
            <li key={item.id}>
              <label
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-action/50',
                  MOTION,
                  selectable ? 'cursor-pointer active:scale-[0.99]' : 'border-transparent bg-canvas opacity-60',
                  selectable && (checked ? 'border-action bg-subtle ring-1 ring-action' : 'border-line hover:border-line-strong hover:bg-subtle'),
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  disabled={!selectable || busy}
                  checked={checked}
                  onChange={() => toggle(item.id)}
                />
                <span aria-hidden className={cn('mt-0.5 shrink-0', checked ? 'text-action' : 'text-faint')}>
                  {checked ? <CheckSquareIcon size={28} weight="fill" /> : <SquareIcon size={28} />}
                </span>
                <span className="min-w-0 flex-1 space-y-1">
                  <span
                    className={cn(
                      'block text-lg font-semibold',
                      item.status === 'cancelled' ? 'text-faint line-through' : 'text-ink',
                    )}
                  >
                    <span className="tabular-nums">{item.quantity} ×</span> {item.name}
                  </span>
                  {item.modifiers.length > 0 && (
                    <span className="block text-base text-ink-soft">{modifierSummary(item.modifiers)}</span>
                  )}
                  {item.note && <span className="block text-base font-medium text-amber-800">Nota: {item.note}</span>}
                  {item.status === 'cancelled' && item.cancel_reason && (
                    <span className="block text-sm text-muted">Rechazado: {item.cancel_reason}</span>
                  )}
                </span>
                <StatusBadge status={item.status} className="mt-1 text-sm" />
              </label>
            </li>
          )
        })}
      </ul>

      <div className="mt-auto space-y-3 border-t border-line pt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted" aria-live="polite">
            {chosen.length === 0
              ? 'Toca los platillos para elegirlos.'
              : chosen.length === 1
                ? '1 platillo elegido'
                : `${chosen.length} platillos elegidos`}
          </p>
          <Button
            variant="ghost"
            className="min-h-11"
            disabled={busy || pending.length === 0}
            onClick={() => setSelected(allChosen ? new Set() : new Set(pending.map((item) => item.id)))}
          >
            {allChosen ? 'Quitar selección' : 'Seleccionar todo'}
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button
            variant="secondary"
            size="md"
            className={ACTION}
            icon={<FireIcon size={20} aria-hidden />}
            disabled={busy || !actions.start}
            onClick={() => move('preparing')}
          >
            Empezar{count}
          </Button>
          <Button
            variant="primary"
            size="md"
            className={ACTION}
            icon={<CheckIcon size={20} aria-hidden />}
            disabled={busy || !actions.ready}
            onClick={() => move('ready')}
          >
            Listo{count}
          </Button>
          <Button
            variant="danger"
            size="md"
            className={ACTION}
            icon={<ProhibitIcon size={20} aria-hidden />}
            disabled={busy || !actions.reject}
            title="Solo se pueden rechazar los platillos que aún no empiezan"
            onClick={() => setRejecting(true)}
          >
            Rechazar{count}
          </Button>
        </div>
      </div>

      {!rejecting && error && <ErrorText>{error}</ErrorText>}

      <Dialog open={rejecting} onOpenChange={(open) => !busy && setRejecting(open)}>
        <DialogContent>
          <form onSubmit={submitReject} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                ¿Rechazar {chosen.length} {chosen.length === 1 ? 'platillo' : 'platillos'}?
              </DialogTitle>
              <DialogDescription>
                Orden #{order.number} · {order.table_name}. Los meseros y la mesa ven el motivo.
              </DialogDescription>
            </DialogHeader>
            <ul className="space-y-1 text-sm text-ink">
              {chosen.map((item) => (
                <li key={item.id}>
                  <span className="font-semibold tabular-nums">{item.quantity} ×</span> {item.name}
                </li>
              ))}
            </ul>
            <TextInput
              aria-label="Motivo"
              autoFocus
              maxLength={MAX_REASON_LENGTH}
              placeholder="Motivo, por ejemplo: Sin aguacate"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            {reasonError && <ErrorText>{reasonError}</ErrorText>}
            {error && <ErrorText>{error}</ErrorText>}
            <DialogFooter>
              <Button variant="ghost" size="md" className="min-h-11" disabled={busy} onClick={() => setRejecting(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="danger" size="md" className="min-h-11" disabled={busy || !actions.reject}>
                {busy ? 'Rechazando…' : 'Rechazar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </article>
  )
}
