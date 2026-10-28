import { CheckIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { Badge, ErrorText } from '../../shared/ui/Feedback.tsx'
import { useRowAction } from '../../shared/ui/useRowAction.ts'
import type { StaffOrder, StaffOrderItem } from '../kitchen/api.ts'
import { staffItemLabel, staffItemTone } from '../kitchen/logic.ts'
import { OrderTicketHeader } from '../kitchen/OrderTicketHeader.tsx'
import { rejectionNote } from '../ordering/logic.ts'
import { deliveryCounter, deliveryProgress, splitDelivery, visibleSections, type DeliverySection, type DeliveryView } from './logic.ts'

interface DeliveryOrderCardProps {
  order: StaffOrder
  now: number
  late: boolean
  view: DeliveryView
  /** Resolves to an error message, or null when the dishes were marked delivered. */
  onDeliver: (itemIds: string[]) => Promise<string | null>
}

const SECTION_TITLES: Record<DeliverySection, string> = {
  ready: 'Ready to take',
  inKitchen: 'In the kitchen',
  delivered: 'Delivered',
  rejected: 'Rejected',
}

function DishLine({ item, children }: { item: StaffOrderItem; children?: ReactNode }) {
  const note = rejectionNote(item)
  return (
    <li className="flex items-start justify-between gap-4 rounded-xl p-2 text-sm">
      <div className="min-w-0 space-y-1">
        <p className={item.status === 'cancelled' ? 'text-zinc-400 line-through' : 'text-zinc-950'}>
          <span className="font-semibold tabular-nums">{item.quantity} ×</span> {item.name}
          <span className="text-zinc-500"> · {item.added_by}</span>
        </p>
        {item.note && <p className="text-amber-800">Note: {item.note}</p>}
        {note && <p className="font-medium text-red-700">{note}</p>}
      </div>
      {children ?? (item.status !== 'cancelled' && <Badge tone={staffItemTone(item.status)}>{staffItemLabel(item.status)}</Badge>)}
    </li>
  )
}

/** One order for the waiter: what to take now, what was delivered and what the kitchen still has. */
export function DeliveryOrderCard({ order, now, late, view, onDeliver }: DeliveryOrderCardProps) {
  const { busy, error, run } = useRowAction()
  const groups = splitDelivery(order)

  function deliver(itemIds: string[]) {
    void run(() => onDeliver(itemIds))
  }

  return (
    <article
      aria-busy={busy}
      aria-label={deliveryCounter(order)}
      className={`flex flex-col gap-4 rounded-2xl border bg-white p-4 ${late ? 'border-red-300 ring-2 ring-red-200' : 'border-zinc-200'}`}
    >
      <OrderTicketHeader
        order={order}
        now={now}
        late={late}
        title={
          // Each half stays on one line; the counter only drops below the table when both cannot fit.
          <>
            <span className="whitespace-nowrap">
              {order.table_name} · Order #{order.number}
            </span>{' '}
            <span className="whitespace-nowrap font-normal text-zinc-500">· {deliveryProgress(order)}</span>
          </>
        }
      />

      {visibleSections(view).map((section) => {
        const items = groups[section]
        if (items.length === 0) return null
        return (
          <section key={section} className="space-y-1">
            <h3 className={`text-xs font-semibold uppercase tracking-wide ${section === 'ready' ? 'text-emerald-700' : 'text-zinc-500'}`}>
              {SECTION_TITLES[section]} ({items.length})
            </h3>
            <ul className={section === 'ready' ? 'rounded-xl bg-emerald-50' : ''}>
              {items.map((item) =>
                section === 'ready' ? (
                  <DishLine key={item.id} item={item}>
                    <Button
                      variant="secondary"
                      icon={<CheckIcon size={16} aria-hidden />}
                      disabled={busy}
                      onClick={() => deliver([item.id])}
                    >
                      Deliver
                    </Button>
                  </DishLine>
                ) : (
                  <DishLine key={item.id} item={item} />
                ),
              )}
            </ul>
          </section>
        )
      })}

      {groups.ready.length > 1 && (
        <Button
          variant="primary"
          className="mt-auto"
          icon={<CheckIcon size={16} aria-hidden />}
          disabled={busy}
          onClick={() => deliver(groups.ready.map((item) => item.id))}
        >
          {busy ? 'Delivering…' : `Deliver all ready (${groups.ready.length})`}
        </Button>
      )}

      {error && <ErrorText>{error}</ErrorText>}
    </article>
  )
}
