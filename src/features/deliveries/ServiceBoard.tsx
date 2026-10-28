import { ProhibitIcon, XIcon } from '@phosphor-icons/react'
import { useCallback, useRef, useState } from 'react'
import { IconButton } from '../../shared/ui/Button.tsx'
import { useNow } from '../../shared/ui/useNow.ts'
import { useSoundAlert } from '../../shared/sound/useSoundAlert.ts'
import type { TableOverview } from '../bills/api.ts'
import { TablesBoard } from '../bills/TablesBoard.tsx'
import { useStaffEvents } from '../kitchen/useStaffEvents.ts'
import { useStaffQueue } from '../kitchen/useStaffQueue.ts'
import { useLateOrderMinutes } from '../settings/useLateOrderMinutes.ts'
import { fetchDeliveries } from './api.ts'
import { DeliveryQueue } from './DeliveryQueue.tsx'
import { hasReady, newRejections, readyIds, type Rejection } from './logic.ts'

/** The waiter's screen: the live delivery queue on top, the tables and their bills below. */
export function ServiceBoard() {
  const sound = useSoundAlert('waiter')
  const now = useNow()
  const lateMinutes = useLateOrderMinutes()
  const [tablesSignal, setTablesSignal] = useState(0)
  const [rejections, setRejections] = useState<Rejection[]>([])
  const seenRejections = useRef<Set<string> | null>(null)

  const queue = useStaffQueue({
    load: fetchDeliveries,
    keep: hasReady,
    alertIds: readyIds,
    onNew: sound.alert,
  })

  useStaffEvents(
    (event) => {
      if (event === 'order.created' || event === 'order.updated') void queue.reload()
      setTablesSignal((signal) => signal + 1)
    },
    () => {
      void queue.reload()
      setTablesSignal((signal) => signal + 1)
    },
  )

  const onTablesLoaded = useCallback((tables: TableOverview[]) => {
    const { seen, rejections: fresh } = newRejections(seenRejections.current, tables)
    seenRejections.current = seen
    if (fresh.length > 0) setRejections((current) => [...fresh, ...current])
  }, [])

  return (
    <div className="space-y-12">
      {rejections.length > 0 && (
        <div role="alert" className="space-y-2 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <p className="flex items-center gap-2 font-semibold text-red-900">
              <ProhibitIcon size={18} aria-hidden />
              The kitchen rejected {rejections.length === 1 ? 'a dish' : `${rejections.length} dishes`}. Let the table know.
            </p>
            <IconButton label="Dismiss" icon={<XIcon size={16} aria-hidden />} onClick={() => setRejections([])} />
          </div>
          <ul className="space-y-1 text-sm text-red-900">
            {rejections.map((rejection) => (
              <li key={rejection.id}>
                {rejection.table_name} · Order #{rejection.order_number} · {rejection.name} — {rejection.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      <DeliveryQueue
        list={queue.list}
        now={now}
        lateMinutes={lateMinutes}
        notice={queue.notice}
        onDismissNotice={queue.dismissNotice}
        onRetry={queue.retry}
        onDeliver={(orderId, itemIds) => queue.act(orderId, itemIds, 'delivered')}
        sound={sound}
      />

      <TablesBoard refreshSignal={tablesSignal} onLoaded={onTablesLoaded} />
    </div>
  )
}
