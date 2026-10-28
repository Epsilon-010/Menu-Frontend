import { CallBellIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Select } from '../../shared/ui/Field.tsx'
import { EmptyState, ListSkeleton, LoadError } from '../../shared/ui/Feedback.tsx'
import { SectionHeader } from '../../shared/ui/Section.tsx'
import { SoundToggle } from '../../shared/ui/SoundToggle.tsx'
import { isLate } from '../kitchen/logic.ts'
import { QueueNotice } from '../kitchen/QueueNotice.tsx'
import type { QueueState } from '../kitchen/useStaffQueue.ts'
import { DeliveryOrderCard } from './DeliveryOrderCard.tsx'
import { deliveryTables, filterByTable, type DeliveryView } from './logic.ts'

interface DeliveryQueueProps {
  list: QueueState
  now: number
  lateMinutes: number
  notice: string | null
  onDismissNotice: () => void
  onRetry: () => void
  onDeliver: (orderId: string, itemIds: string[]) => Promise<string | null>
  sound: { enabled: boolean; toggle: () => void }
}

/** Orders with dishes ready to take, oldest ready dish first, filtered by what to show and by table. */
export function DeliveryQueue({ list, now, lateMinutes, notice, onDismissNotice, onRetry, onDeliver, sound }: DeliveryQueueProps) {
  const [view, setView] = useState<DeliveryView>('all')
  const [tableId, setTableId] = useState<string | null>(null)

  const orders = list.status === 'loaded' ? list.orders : []
  const tables = deliveryTables(orders)
  const shown = filterByTable(orders, tableId)

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Ready to deliver"
        description={`Dishes appear here as soon as the kitchen marks them ready, inside their order. Orders waiting over ${lateMinutes} min are highlighted.`}
        action={<SoundToggle enabled={sound.enabled} onToggle={sound.toggle} announces="dishes ready to take" />}
      />

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          Show
          <Select value={view} onChange={(event) => setView(event.target.value as DeliveryView)} className="w-auto">
            <option value="all">Whole order</option>
            <option value="ready">Only ready dishes</option>
          </Select>
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          Table
          <Select
            value={tableId ?? ''}
            onChange={(event) => setTableId(event.target.value === '' ? null : event.target.value)}
            className="w-auto"
          >
            <option value="">All tables</option>
            {tableId !== null && !tables.some((table) => table.id === tableId) && (
              <option value={tableId}>Selected table</option>
            )}
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.name}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {notice && <QueueNotice message={notice} onDismiss={onDismissNotice} />}

      {list.status === 'loading' && <ListSkeleton rows={2} label="Loading dishes ready to deliver" />}
      {list.status === 'error' && <LoadError message={list.message} onRetry={onRetry} />}
      {list.status === 'loaded' &&
        (shown.length === 0 ? (
          <EmptyState icon={<CallBellIcon size={24} aria-hidden />} title="Nothing to deliver right now">
            {tableId === null
              ? 'When the kitchen marks a dish ready, its order shows up here.'
              : 'This table has no dishes ready. Choose All tables to see the rest.'}
          </EmptyState>
        ) : (
          <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((order) => (
              <DeliveryOrderCard
                key={order.id}
                order={order}
                now={now}
                late={isLate(order.created_at, now, lateMinutes)}
                view={view}
                onDeliver={(itemIds) => onDeliver(order.id, itemIds)}
              />
            ))}
          </div>
        ))}
    </div>
  )
}
