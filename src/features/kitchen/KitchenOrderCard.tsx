import { CheckIcon, FireIcon, ProhibitIcon } from '@phosphor-icons/react'
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
import { Button, IconButton } from '../../shared/ui/Button.tsx'
import { TextInput } from '../../shared/ui/Field.tsx'
import { ErrorText } from '../../shared/ui/Feedback.tsx'
import { useRowAction } from '../../shared/ui/useRowAction.ts'
import { cancellationNote } from '../ordering/logic.ts'
import { modifierSummary } from '../ordering/modifiers.ts'
import type { ItemTarget, StaffOrder, StaffOrderItem } from './api.ts'
import { isPending, MAX_REASON_LENGTH, rejectReasonError } from './logic.ts'
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

/** What a dish says about itself: quantity, name, options and the guest's note. */
function DishText({ item, dimmed = false }: { item: StaffOrderItem; dimmed?: boolean }) {
  const note = cancellationNote(item)
  return (
    <div className="min-w-0 space-y-1">
      <p
        className={cn(
          'font-semibold text-pretty',
          dimmed ? 'text-base' : 'text-lg',
          item.status === 'cancelled' ? 'text-faint line-through' : dimmed ? 'text-ink-soft' : 'text-ink',
        )}
      >
        <span className="tabular-nums">{item.quantity} ×</span> {item.name}
      </p>
      {item.modifiers.length > 0 && <p className="text-base text-ink-soft">{modifierSummary(item.modifiers)}</p>}
      {/* The guest's note matters while the dish is still to cook, not once it left or was cancelled. */}
      {item.note && !dimmed && <p className="text-base font-medium text-amber-800">Nota: {item.note}</p>}
      {note && <p className="text-sm text-muted">{note}</p>}
    </div>
  )
}

/**
 * One ticket for the kitchen. Each dish still to cook carries its own next step, so nothing has to be
 * selected first; the footer moves every dish of the ticket at once.
 */
export function KitchenOrderCard({ order, now, late, onAct }: KitchenOrderCardProps) {
  const [rejecting, setRejecting] = useState<StaffOrderItem | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const { busy, error, run } = useRowAction()

  const pending = order.items.filter(isPending)
  const queued = pending.filter((item) => item.status === 'queued')
  const done = order.items.filter((item) => !isPending(item))

  function closeReject() {
    setRejecting(null)
    setReason('')
    setReasonError(null)
  }

  function move(items: StaffOrderItem[], target: ItemTarget, why?: string) {
    void run(() => onAct(items.map((item) => item.id), target, why), closeReject)
  }

  function submitReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (rejecting === null) return
    const problem = rejectReasonError(reason)
    setReasonError(problem)
    if (problem === null) move([rejecting], 'cancelled', reason.trim())
  }

  return (
    <article
      aria-busy={busy}
      aria-label={`Orden ${order.number}, ${order.table_name}`}
      className={cn(
        'flex flex-col gap-4 rounded-2xl border bg-surface p-4 shadow-xs',
        late ? 'border-red-300 ring-2 ring-red-200' : 'border-line',
      )}
    >
      <OrderTicketHeader order={order} now={now} late={late} size="large" />

      <ul className="space-y-2">
        {pending.map((item) => (
          <li
            key={item.id}
            className={cn(
              'space-y-3 rounded-xl border p-3',
              item.status === 'preparing' ? 'border-amber-300 bg-amber-50' : 'border-line bg-canvas',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <DishText item={item} />
              <StatusBadge status={item.status} className="mt-1 shrink-0 text-sm" />
            </div>
            {/* The buttons wrap onto their own rows on a narrow ticket; they never squeeze into each other. */}
            <div className="flex flex-wrap items-center gap-2">
              {item.status === 'queued' && (
                <Button
                  variant="secondary"
                  size="md"
                  className={cn(ACTION, 'flex-1')}
                  icon={<FireIcon size={20} aria-hidden />}
                  disabled={busy}
                  onClick={() => move([item], 'preparing')}
                >
                  Empezar
                </Button>
              )}
              <Button
                variant={item.status === 'preparing' ? 'primary' : 'secondary'}
                size="md"
                className={cn(ACTION, 'flex-1')}
                icon={<CheckIcon size={20} aria-hidden />}
                disabled={busy}
                onClick={() => move([item], 'ready')}
              >
                Listo
              </Button>
              {item.status === 'queued' && (
                <IconButton
                  label={`Rechazar ${item.name}`}
                  tone="danger"
                  className="size-12 shrink-0"
                  icon={<ProhibitIcon size={20} aria-hidden />}
                  disabled={busy}
                  onClick={() => setRejecting(item)}
                />
              )}
            </div>
          </li>
        ))}
      </ul>

      {done.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Ya salieron ({done.length})</h3>
          <ul className="space-y-2">
            {done.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3">
                <DishText item={item} dimmed />
                <StatusBadge status={item.status} className="mt-1 shrink-0" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {pending.length > 1 && (
        <div className="mt-auto flex flex-wrap gap-2">
          {queued.length > 1 && (
            <Button
              variant="secondary"
              size="md"
              className={cn(ACTION, 'flex-1')}
              icon={<FireIcon size={20} aria-hidden />}
              disabled={busy}
              onClick={() => move(queued, 'preparing')}
            >
              Empezar todo ({queued.length})
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            className={cn(ACTION, 'flex-1')}
            icon={<CheckIcon size={20} aria-hidden />}
            disabled={busy}
            onClick={() => move(pending, 'ready')}
          >
            Todo listo ({pending.length})
          </Button>
        </div>
      )}

      {rejecting === null && error && <ErrorText>{error}</ErrorText>}

      <Dialog open={rejecting !== null} onOpenChange={(open) => !open && !busy && closeReject()}>
        <DialogContent>
          <form onSubmit={submitReject} className="space-y-4">
            <DialogHeader>
              <DialogTitle>¿Rechazar este platillo?</DialogTitle>
              <DialogDescription>
                Orden #{order.number} · {order.table_name}. Los meseros y la mesa ven el motivo.
              </DialogDescription>
            </DialogHeader>
            {rejecting && (
              <p className="text-sm text-ink">
                <span className="font-semibold tabular-nums">{rejecting.quantity} ×</span> {rejecting.name}
              </p>
            )}
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
              <Button variant="ghost" size="md" className="min-h-11" disabled={busy} onClick={closeReject}>
                Conservarlo
              </Button>
              <Button type="submit" variant="danger" size="md" className="min-h-11" disabled={busy}>
                {busy ? 'Rechazando…' : 'Rechazar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </article>
  )
}
