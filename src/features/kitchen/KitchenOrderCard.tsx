import { CheckIcon, FireIcon, ProhibitIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { TextInput } from '../../shared/ui/Field.tsx'
import { Badge, ErrorText } from '../../shared/ui/Feedback.tsx'
import { useRowAction } from '../../shared/ui/useRowAction.ts'
import type { ItemTarget, StaffOrder } from './api.ts'
import {
  isPending,
  kitchenActions,
  MAX_REASON_LENGTH,
  pendingSelection,
  rejectReasonError,
  staffItemLabel,
  staffItemTone,
} from './logic.ts'
import { OrderTicketHeader } from './OrderTicketHeader.tsx'

interface KitchenOrderCardProps {
  order: StaffOrder
  now: number
  late: boolean
  /** Resolves to an error message, or null when the dishes moved. */
  onAct: (itemIds: string[], target: ItemTarget, reason?: string) => Promise<string | null>
}

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
      aria-label={`Order ${order.number}, ${order.table_name}`}
      className={`flex flex-col gap-4 rounded-2xl border bg-white p-4 ${late ? 'border-red-300 ring-2 ring-red-200' : 'border-zinc-200'}`}
    >
      <OrderTicketHeader order={order} now={now} late={late} />

      <ul className="space-y-1">
        {order.items.map((item) => {
          const selectable = isPending(item)
          const checked = selectable && selected.has(item.id)
          return (
            <li key={item.id}>
              <label
                className={`flex items-start gap-3 rounded-xl p-2 ${selectable ? 'cursor-pointer hover:bg-zinc-50' : 'opacity-60'} ${checked ? 'bg-zinc-100' : ''}`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-zinc-950"
                  disabled={!selectable || busy}
                  checked={checked}
                  onChange={() => toggle(item.id)}
                />
                <span className="min-w-0 flex-1 space-y-1">
                  <span className={`block ${item.status === 'cancelled' ? 'text-zinc-400 line-through' : 'text-zinc-950'}`}>
                    <span className="font-semibold tabular-nums">{item.quantity} ×</span> {item.name}
                  </span>
                  {item.note && <span className="block text-sm text-amber-800">Note: {item.note}</span>}
                  {item.status === 'cancelled' && item.cancel_reason && (
                    <span className="block text-sm text-zinc-500">Rejected: {item.cancel_reason}</span>
                  )}
                </span>
                <Badge tone={staffItemTone(item.status)}>{staffItemLabel(item.status)}</Badge>
              </label>
            </li>
          )
        })}
      </ul>

      {!rejecting ? (
        <div className="mt-auto flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
          <Button
            variant="ghost"
            disabled={busy || pending.length === 0}
            onClick={() => setSelected(allChosen ? new Set() : new Set(pending.map((item) => item.id)))}
          >
            {allChosen ? 'Clear' : 'Select all'}
          </Button>
          <Button
            variant="secondary"
            icon={<FireIcon size={16} aria-hidden />}
            disabled={busy || !actions.start}
            onClick={() => move('preparing')}
          >
            Start{count}
          </Button>
          <Button
            variant="primary"
            icon={<CheckIcon size={16} aria-hidden />}
            disabled={busy || !actions.ready}
            onClick={() => move('ready')}
          >
            Ready{count}
          </Button>
          <Button
            variant="danger"
            icon={<ProhibitIcon size={16} aria-hidden />}
            disabled={busy || !actions.reject}
            title="Only dishes not started yet can be rejected"
            onClick={() => setRejecting(true)}
          >
            Reject{count}
          </Button>
        </div>
      ) : (
        <form onSubmit={submitReject} className="mt-auto space-y-2 rounded-xl bg-red-50 p-4">
          <p className="text-sm text-red-900">
            Reject {chosen.length} {chosen.length === 1 ? 'dish' : 'dishes'}? The waiters and the table see the reason.
          </p>
          <TextInput
            aria-label="Reason"
            autoFocus
            maxLength={MAX_REASON_LENGTH}
            placeholder="Reason, like Out of avocado"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          {reasonError && <ErrorText>{reasonError}</ErrorText>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="danger" disabled={busy || !actions.reject}>
              {busy ? 'Rejecting…' : 'Reject'}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setRejecting(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {error && <ErrorText>{error}</ErrorText>}
    </article>
  )
}
