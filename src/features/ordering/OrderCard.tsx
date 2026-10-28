import type { ReactNode } from 'react'
import { Badge } from '../../shared/ui/Feedback.tsx'
import { formatMoney } from '../catalog/price.ts'
import type { Order, OrderItem } from './api.ts'
import { clockTime, itemStatusLabel, itemStatusTone, orderStatusLabel, rejectionNote } from './logic.ts'

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
    <article className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-zinc-950">Order #{order.number}</h3>
          <p className="text-xs text-zinc-500">
            Sent by {order.sent_by}
            {clockTime(order.created_at) && ` at ${clockTime(order.created_at)}`}
          </p>
        </div>
        <Badge tone={order.status === 'completed' ? 'success' : 'neutral'}>{orderStatusLabel(order.status)}</Badge>
      </header>
      <ul className="space-y-2">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-4 text-sm">
            <div className="min-w-0 space-y-1">
              <p className={item.status === 'cancelled' ? 'text-zinc-400 line-through' : 'text-zinc-950'}>
                <span className="font-semibold tabular-nums">{item.quantity} ×</span> {item.name}
                <span className="text-zinc-500"> · {item.added_by}</span>
              </p>
              {item.note && <p className="text-zinc-500">{item.note}</p>}
              {item.status === 'cancelled' ? (
                <p className="text-sm font-medium text-red-700">{rejectionNote(item)}</p>
              ) : (
                <Badge tone={itemStatusTone(item.status)}>{itemStatusLabel(item.status)}</Badge>
              )}
              {itemActions?.(item)}
            </div>
            {showPrices && (
              <span className="shrink-0 text-zinc-700 tabular-nums">{formatMoney(item.subtotal_cents)}</span>
            )}
          </li>
        ))}
      </ul>
      {footer}
      {showPrices && (
        <div className="flex items-center justify-between border-t border-zinc-100 pt-3 text-sm">
          <span className="text-zinc-500">Total</span>
          <span className="font-semibold text-zinc-950 tabular-nums">{formatMoney(order.total_cents)}</span>
        </div>
      )}
    </article>
  )
}
