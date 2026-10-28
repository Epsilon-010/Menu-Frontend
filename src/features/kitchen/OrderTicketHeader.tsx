import { TimerIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { clockTime } from '../ordering/logic.ts'
import type { StaffOrder } from './api.ts'
import { waitingLabel } from './logic.ts'

interface OrderTicketHeaderProps {
  order: StaffOrder
  now: number
  late: boolean
  /** Replaces the title, like "Table 1 · Order #12 · 2 of 5 delivered". */
  title?: ReactNode
}

/** Title of a kitchen or delivery ticket with its live waiting time, red once it is late. */
export function OrderTicketHeader({ order, now, late, title }: OrderTicketHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold text-zinc-950">
          {title ?? (
            <>
              Order #{order.number} <span className="font-normal text-zinc-500">· {order.table_name}</span>
            </>
          )}
        </h2>
        <p className="text-xs text-zinc-500">
          Sent by {order.sent_by}
          {clockTime(order.created_at) && ` at ${clockTime(order.created_at)}`}
        </p>
      </div>
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold tabular-nums ${late ? 'bg-red-100 text-red-800' : 'bg-zinc-100 text-zinc-700'}`}
      >
        <TimerIcon size={16} aria-hidden />
        {waitingLabel(order.created_at, now)}
        {late && <span className="sr-only"> (late)</span>}
      </span>
    </header>
  )
}
