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
        title="Kitchen"
        description={`Orders arrive as soon as a table sends them, oldest first. Work on any of them: select dishes to start them, mark them ready or reject the ones you cannot make. Tickets waiting over ${lateMinutes} min are highlighted.`}
        action={<SoundToggle enabled={sound.enabled} onToggle={sound.toggle} announces="new orders" />}
      />

      {queue.notice && <QueueNotice message={queue.notice} onDismiss={queue.dismissNotice} />}

      {queue.list.status === 'loading' && <ListSkeleton label="Loading the kitchen queue" />}
      {queue.list.status === 'error' && <LoadError message={queue.list.message} onRetry={queue.retry} />}
      {queue.list.status === 'loaded' &&
        (orders.length === 0 ? (
          <EmptyState icon={<CookingPotIcon size={24} aria-hidden />} title="The queue is empty">
            New orders arrive here as soon as a table sends them, oldest first. You choose which dishes to start.
          </EmptyState>
        ) : (
          <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
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
