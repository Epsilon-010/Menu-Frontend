import { CheckCircleIcon, CheckIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { ErrorText } from '../../shared/ui/Feedback.tsx'
import { useRowAction } from '../../shared/ui/useRowAction.ts'
import type { StaffOrder, StaffOrderItem } from '../kitchen/api.ts'
import { OrderTicketHeader } from '../kitchen/OrderTicketHeader.tsx'
import { StatusBadge } from '../kitchen/StatusBadge.tsx'
import { cancellationNote } from '../ordering/logic.ts'
import { modifierSummary } from '../ordering/modifiers.ts'
import { ticketClass } from '../kitchen/logic.ts'
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
  ready: 'Listos para llevar',
  inKitchen: 'En cocina',
  delivered: 'Entregados',
  rejected: 'Cancelados',
}

function DishLine({ item, children }: { item: StaffOrderItem; children?: ReactNode }) {
  const note = cancellationNote(item)
  return (
    <li className="flex items-center justify-between gap-3 py-2 text-sm">
      <div className="min-w-0 space-y-1">
        <p className={item.status === 'cancelled' ? 'text-faint line-through' : 'text-ink'}>
          <span className="font-semibold tabular-nums">{item.quantity} ×</span> <span className="font-medium">{item.name}</span>
          <span className="text-muted"> · {item.added_by}</span>
        </p>
        {item.modifiers.length > 0 && <p className="text-ink-soft">{modifierSummary(item.modifiers)}</p>}
        {item.note && <p className="text-amber-800">Nota: {item.note}</p>}
        {note && <p className="font-medium text-red-700">{note}</p>}
      </div>
      {children ?? (item.status !== 'cancelled' && <StatusBadge status={item.status} className="shrink-0" />)}
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
      className={ticketClass(late)}
    >
      <OrderTicketHeader
        order={order}
        now={now}
        late={late}
        title={
          // The table and its order never break apart; the counter takes its own line under them.
          <>
            <span className="block">
              {order.table_name} <span className="whitespace-nowrap">· Orden #{order.number}</span>
            </span>
            <span className="block text-base font-normal text-muted">{deliveryProgress(order)}</span>
          </>
        }
      />

      {visibleSections(view).map((section) => {
        const items = groups[section]
        if (items.length === 0) return null
        if (section === 'ready') {
          return (
            <section key={section} className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <CheckCircleIcon size={18} weight="fill" aria-hidden />
                {SECTION_TITLES[section]} ({items.length})
              </h3>
              <ul className="divide-y divide-emerald-200">
                {items.map((item) => (
                  <DishLine key={item.id} item={item}>
                    <Button
                      variant="secondary"
                      className="min-h-11 shrink-0"
                      icon={<CheckIcon size={16} aria-hidden />}
                      disabled={busy}
                      onClick={() => deliver([item.id])}
                    >
                      Entregar
                    </Button>
                  </DishLine>
                ))}
              </ul>
            </section>
          )
        }
        return (
          <section key={section} className="space-y-1 px-1">
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
              {SECTION_TITLES[section]} ({items.length})
            </h3>
            <ul className="divide-y divide-line">
              {items.map((item) => (
                <DishLine key={item.id} item={item} />
              ))}
            </ul>
          </section>
        )
      })}

      {groups.ready.length > 1 && (
        <Button
          variant="primary"
          size="md"
          className="mt-auto min-h-12 w-full"
          icon={<CheckIcon size={20} aria-hidden />}
          disabled={busy}
          onClick={() => deliver(groups.ready.map((item) => item.id))}
        >
          {busy ? 'Entregando…' : `Entregar todos los listos (${groups.ready.length})`}
        </Button>
      )}

      {error && <ErrorText>{error}</ErrorText>}
    </article>
  )
}
