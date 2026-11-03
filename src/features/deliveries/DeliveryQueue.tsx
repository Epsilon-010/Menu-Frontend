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
        title="Listos para entregar"
        description={`Los platillos aparecen aquí, dentro de su orden, en cuanto la cocina los marca como listos. Se resaltan las órdenes que esperan más de ${lateMinutes} min.`}
        action={<SoundToggle enabled={sound.enabled} onToggle={sound.toggle} announces="platillos listos para llevar" />}
      />

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          Mostrar
          <Select value={view} onChange={(event) => setView(event.target.value as DeliveryView)} className="w-auto">
            <option value="all">Toda la orden</option>
            <option value="ready">Solo platillos listos</option>
          </Select>
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          Mesa
          <Select
            value={tableId ?? ''}
            onChange={(event) => setTableId(event.target.value === '' ? null : event.target.value)}
            className="w-auto"
          >
            <option value="">Todas las mesas</option>
            {tableId !== null && !tables.some((table) => table.id === tableId) && (
              <option value={tableId}>Mesa seleccionada</option>
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

      {list.status === 'loading' && <ListSkeleton rows={2} label="Cargando platillos listos para entregar" />}
      {list.status === 'error' && <LoadError message={list.message} onRetry={onRetry} />}
      {list.status === 'loaded' &&
        (shown.length === 0 ? (
          <EmptyState icon={<CallBellIcon size={24} aria-hidden />} title="Nada que entregar por ahora">
            {tableId === null
              ? 'Cuando la cocina marca un platillo como listo, su orden aparece aquí.'
              : 'Esta mesa no tiene platillos listos. Elige Todas las mesas para ver el resto.'}
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
