import { clockTime } from '../ordering/logic.ts'
import type { StaffOrder } from './api.ts'
import { finishedAt } from './logic.ts'
import { StatusBadge } from './StatusBadge.tsx'

/**
 * The orders the kitchen already got out, newest first, below the queue: enough to answer "did order 12
 * go out?" without them taking the room of what is still to cook. They leave when the bill is paid.
 */
export function FinishedOrders({ orders }: { orders: StaffOrder[] }) {
  if (orders.length === 0) return null
  return (
    <section aria-labelledby="finished-title" className="space-y-4">
      <div className="space-y-1">
        <h2 id="finished-title" className="text-xl font-semibold tracking-tight text-ink">
          Terminadas ({orders.length})
        </h2>
        <p className="text-sm text-muted">Órdenes sin nada pendiente en cocina. Se quitan al cobrar la cuenta.</p>
      </div>
      <ul className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {orders.map((order) => {
          const time = clockTime(finishedAt(order))
          return (
            <li key={order.id} className="space-y-3 rounded-3xl bg-surface p-4 shadow-sm shadow-brand/5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 font-semibold text-ink">
                  {order.table_name} <span className="font-normal text-muted">· Orden #{order.number}</span>
                </p>
                {time && <span className="shrink-0 text-sm text-muted tabular-nums">{time}</span>}
              </div>
              <ul className="space-y-2">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className={item.status === 'cancelled' ? 'text-faint line-through' : 'text-ink-soft'}>
                      <span className="font-semibold tabular-nums">{item.quantity} ×</span> {item.name}
                    </span>
                    <StatusBadge status={item.status} className="shrink-0" />
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
