import { TimerIcon, WarningIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils.ts'
import { clockTime } from '../ordering/logic.ts'
import type { StaffOrder } from './api.ts'
import { waitingLabel } from './logic.ts'

interface OrderTicketHeaderProps {
  order: StaffOrder
  now: number
  late: boolean
  /** Replaces the title, like "Table 1 · Order #12 · 2 of 5 delivered". */
  title?: ReactNode
  /** `large` for the kitchen screen, read from a distance; `regular` for the waiter's cards. */
  size?: 'large' | 'regular'
}

/** Title of a kitchen or delivery ticket with its live waiting time; once late it turns red and says so. */
export function OrderTicketHeader({ order, now, late, title, size = 'regular' }: OrderTicketHeaderProps) {
  const large = size === 'large'
  const sentAt = clockTime(order.created_at)
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1 basis-32 space-y-1">
        <h2 className={cn('font-semibold tracking-tight text-balance text-ink', large ? 'text-2xl' : 'text-lg')}>
          {title ?? (
            <>
              Orden #{order.number} <span className="font-normal text-muted">· {order.table_name}</span>
            </>
          )}
        </h2>
        <p className={cn('text-muted', large ? 'text-sm' : 'text-xs')}>
          Enviada por {order.sent_by}
          {sentAt && ` a las ${sentAt}`}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-lg font-semibold tabular-nums',
            large ? 'px-3 py-2 text-xl' : 'px-2 py-1 text-base',
            late ? 'bg-red-600 text-white' : 'bg-subtle text-ink',
          )}
        >
          <TimerIcon size={large ? 20 : 16} aria-hidden />
          {waitingLabel(order.created_at, now)}
        </span>
        {late && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
            <WarningIcon size={14} weight="fill" aria-hidden />
            Retrasada
          </span>
        )}
      </div>
    </header>
  )
}
