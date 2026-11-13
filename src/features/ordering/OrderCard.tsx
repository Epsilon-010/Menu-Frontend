import type { ReactNode } from 'react'
import { Badge } from '../../shared/ui/Feedback.tsx'
import { formatMoney } from '../catalog/price.ts'
import type { Order, OrderItem } from './api.ts'
import { clockTime, itemStatusLabel, itemStatusTone, orderStatusLabel, cancellationNote } from './logic.ts'
import { modifierSummary } from './modifiers.ts'

interface OrderCardProps {
  order: Order
  /** Staff see each dish's price; the table sees them too, it pays the bill. */
  showPrices?: boolean
  /** Staff controls under a dish, like cancelling it (none at the table). */
  itemActions?: (item: OrderItem) => ReactNode
  /** Staff controls under the dishes, like adding one (none at the table). */
  footer?: ReactNode
}

/** One sent order: number, who sent it, each dish with its status and the total. */
export function OrderCard({ order, showPrices = true, itemActions, footer }: OrderCardProps) {
  return (
    <article className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-ink">Orden #{order.number}</h3>
          <p className="text-xs text-muted">
            Enviada por {order.sent_by}
            {clockTime(order.created_at) && ` a las ${clockTime(order.created_at)}`}
          </p>
        </div>
        <Badge tone={order.status === 'completed' ? 'success' : 'neutral'}>{orderStatusLabel(order.status)}</Badge>
      </header>
      <ul className="space-y-2">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-4 text-sm">
            <div className="min-w-0 space-y-1 wrap-anywhere">
              <p className={item.status === 'cancelled' ? 'text-faint line-through' : 'text-ink'}>
                <span className="font-semibold tabular-nums">{item.quantity} ×</span> {item.name}
                <span className="text-muted"> · {item.added_by}</span>
              </p>
              {item.modifiers.length > 0 && <p className="text-muted">{modifierSummary(item.modifiers, showPrices)}</p>}
              {item.note && <p className="text-muted">{item.note}</p>}
              {item.status === 'cancelled' ? (
                <p className="text-sm font-medium text-danger">{cancellationNote(item)}</p>
              ) : (
                // The status and the staff's action share a row and wrap together on a narrow card.
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Badge tone={itemStatusTone(item.status)}>{itemStatusLabel(item.status)}</Badge>
                  {itemActions?.(item)}
                </div>
              )}
            </div>
            {showPrices && (
              // A cancelled dish is not charged: its price stays readable but crossed out.
              <span className={`shrink-0 tabular-nums ${item.status === 'cancelled' ? 'text-faint line-through' : 'text-ink-soft'}`}>
                {formatMoney(item.subtotal_cents)}
              </span>
            )}
          </li>
        ))}
      </ul>
      {footer}
      {showPrices && (
        <div className="flex items-center justify-between border-t border-subtle pt-3 text-sm">
          <span className="text-muted">Total</span>
          <span className="font-semibold text-ink tabular-nums">{formatMoney(order.total_cents)}</span>
        </div>
      )}
    </article>
  )
}
