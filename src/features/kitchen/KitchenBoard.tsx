import { CookingPotIcon } from '@phosphor-icons/react'
import { EmptyState, ListSkeleton, LoadError } from '../../shared/ui/Feedback.tsx'
import { SectionHeader } from '../../shared/ui/Section.tsx'
import { SoundToggle } from '../../shared/ui/SoundToggle.tsx'
import { useNow } from '../../shared/ui/useNow.ts'
import { useSoundAlert } from '../../shared/sound/useSoundAlert.ts'
import { useLateOrderMinutes } from '../settings/useLateOrderMinutes.ts'
import { fetchKitchenOrders } from './api.ts'
import { KitchenOrderCard } from './KitchenOrderCard.tsx'
import { hasPending, isLate, kitchenQueue } from './logic.ts'
import { QueueNotice } from './QueueNotice.tsx'
import { useStaffEvents } from './useStaffEvents.ts'
import { useStaffQueue } from './useStaffQueue.ts'

/** The kitchen queue: one ticket per order with dishes still to cook, oldest first, any one can go first. */
export function KitchenBoard() {
  const sound = useSoundAlert('kitchen')
  const now = useNow()
  const lateMinutes = useLateOrderMinutes()
  const queue = useStaffQueue({
    load: fetchKitchenOrders,
    keep: hasPending,
    alertIds: (orders) => orders.map((order) => order.id),
    onNew: sound.alert,
  })

  useStaffEvents(
    (event) => {
      if (event === 'order.created' || event === 'order.updated') void queue.reload()
    },
    () => void queue.reload(),
  )

  const orders = queue.list.status === 'loaded' ? kitchenQueue(queue.list.orders) : []

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Cocina"
        description={`De la más antigua a la más reciente. Se resaltan las que esperan más de ${lateMinutes} min.`}
        action={<SoundToggle enabled={sound.enabled} onToggle={sound.toggle} announces="órdenes nuevas" />}
      />

      {queue.notice && <QueueNotice message={queue.notice} onDismiss={queue.dismissNotice} />}

      {queue.list.status === 'loading' && <ListSkeleton label="Cargando la cola de cocina" />}
      {queue.list.status === 'error' && <LoadError message={queue.list.message} onRetry={queue.retry} />}
      {queue.list.status === 'loaded' &&
        (orders.length === 0 ? (
          <EmptyState icon={<CookingPotIcon size={24} aria-hidden />} title="La cola está vacía">
            Las órdenes nuevas llegan aquí en cuanto una mesa las envía, de la más antigua a la más reciente. Tú eliges qué platillos empezar.
          </EmptyState>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            {orders.map((order) => (
              <KitchenOrderCard
                key={order.id}
                order={order}
                now={now}
                late={isLate(order.created_at, now, lateMinutes)}
                onAct={(itemIds, target, reason) => queue.act(order.id, itemIds, target, reason)}
              />
            ))}
          </div>
        ))}
    </div>
  )
}
