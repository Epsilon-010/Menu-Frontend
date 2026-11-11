import { CallBellIcon } from '@phosphor-icons/react'
import { useId, useState } from 'react'
import { Label } from '../../components/ui/label.tsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select.tsx'
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group.tsx'
import { EmptyState, ListSkeleton, LoadError } from '../../shared/ui/Feedback.tsx'
import { SectionHeader } from '../../shared/ui/Section.tsx'
import { SoundToggle } from '../../shared/ui/SoundToggle.tsx'
import { isLate } from '../kitchen/logic.ts'
import { QueueNotice } from '../kitchen/QueueNotice.tsx'
import type { QueueState } from '../kitchen/useStaffQueue.ts'
import { DeliveryOrderCard } from './DeliveryOrderCard.tsx'
import { deliveryTables, filterByTable, type DeliveryView } from './logic.ts'

/** The "every table" choice; table ids are UUIDs, so it never collides with one. */
const ALL_TABLES = 'all'

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
  const ids = useId()
  const selectedName =
    tableId === null ? 'Todas las mesas' : (tables.find((table) => table.id === tableId)?.name ?? 'Mesa seleccionada')

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={<CallBellIcon size={24} weight="fill" aria-hidden />}
        title="Listos para entregar"
        description={`Los platillos aparecen aquí, dentro de su orden, en cuanto la cocina los marca como listos. Se resaltan las órdenes que esperan más de ${lateMinutes} min.`}
        action={<SoundToggle enabled={sound.enabled} onToggle={sound.toggle} announces="platillos listos para llevar" />}
      />

      <div className="flex flex-wrap items-start gap-4">
        <div className="space-y-2">
          <span id={`${ids}-view`} className="block text-sm font-medium text-ink-soft">
            Mostrar
          </span>
          <ToggleGroup
            type="single"
            value={view}
            aria-labelledby={`${ids}-view`}
            // Pressing the chosen option again would clear it; the filter always has a value.
            onValueChange={(next) => next && setView(next as DeliveryView)}
          >
            <ToggleGroupItem value="all" className="min-h-11">
              Toda la orden
            </ToggleGroupItem>
            <ToggleGroupItem value="ready" className="min-h-11">
              Solo platillos listos
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="w-56 space-y-2">
          <Label id={`${ids}-table`} htmlFor={`${ids}-table-control`}>
            Mesa
          </Label>
          <Select value={tableId ?? ALL_TABLES} onValueChange={(next) => setTableId(next === ALL_TABLES ? null : next)}>
            <SelectTrigger id={`${ids}-table-control`} className="min-h-11">
              <SelectValue>{selectedName}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TABLES}>Todas las mesas</SelectItem>
              {tableId !== null && !tables.some((table) => table.id === tableId) && (
                <SelectItem value={tableId}>Mesa seleccionada</SelectItem>
              )}
              {tables.map((table) => (
                <SelectItem key={table.id} value={table.id}>
                  {table.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
