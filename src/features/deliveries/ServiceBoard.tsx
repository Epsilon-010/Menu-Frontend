import { ArrowDownIcon, BellRingingIcon, ProhibitIcon, XIcon } from '@phosphor-icons/react'
import { useCallback, useRef, useState } from 'react'
import { Button } from '../../components/ui/button.tsx'
import { IconButton } from '../../shared/ui/Button.tsx'
import { useNow } from '../../shared/ui/useNow.ts'
import { useSoundAlert } from '../../shared/sound/useSoundAlert.ts'
import type { TableOverview } from '../bills/api.ts'
import { billRequests, newBillRequests, tableCardId, tableIdOf, withoutTable, type BillRequest } from '../bills/logic.ts'
import { TablesBoard } from '../bills/TablesBoard.tsx'
import { useStaffEvents } from '../kitchen/useStaffEvents.ts'
import { useStaffQueue } from '../kitchen/useStaffQueue.ts'
import { clockTime } from '../ordering/logic.ts'
import { useLateOrderMinutes } from '../settings/useLateOrderMinutes.ts'
import { fetchDeliveries } from './api.ts'
import { DeliveryQueue } from './DeliveryQueue.tsx'
import { DeliveredNotes } from './DeliveredNotes.tsx'
import { deliveredNotes, hasReady, newRejections, readyIds, type DeliveredNote, type Rejection } from './logic.ts'

/** The waiter's screen: the live delivery queue on top, the tables and their bills below. */
export function ServiceBoard() {
  const sound = useSoundAlert('waiter')
  const now = useNow()
  const lateMinutes = useLateOrderMinutes()
  const [tablesSignal, setTablesSignal] = useState(0)
  const [rejections, setRejections] = useState<Rejection[]>([])
  const seenRejections = useRef<Set<string> | null>(null)
  const [requests, setRequests] = useState<BillRequest[]>([])
  const seenRequests = useRef<Set<string> | null>(null)
  const [openedAt] = useState(() => Date.now())
  const [delivered, setDelivered] = useState<DeliveredNote[]>([])

  const queue = useStaffQueue({
    load: fetchDeliveries,
    keep: hasReady,
    alertIds: readyIds,
    onNew: sound.alert,
  })

  useStaffEvents(
    (event, data) => {
      if (event === 'order.created' || event === 'order.updated') void queue.reload()
      // Drop an ended request from the banner at once, even if the reload below fails.
      const tableId = event === 'bill.request_cleared' || event === 'bill.closed' ? tableIdOf(data) : null
      if (tableId !== null) setRequests((current) => withoutTable(current, tableId))
      setTablesSignal((signal) => signal + 1)
    },
    () => {
      void queue.reload()
      setTablesSignal((signal) => signal + 1)
    },
  )

  const alert = sound.alert
  const onTablesLoaded = useCallback(
    (tables: TableOverview[]) => {
      const { seen, rejections: fresh } = newRejections(seenRejections.current, tables)
      seenRejections.current = seen
      if (fresh.length > 0) setRejections((current) => [...fresh, ...current])
      const asked = newBillRequests(seenRequests.current, tables, openedAt)
      seenRequests.current = asked.seen
      setRequests(billRequests(tables))
      setDelivered(deliveredNotes(tables))
      if (asked.fresh > 0) alert()
    },
    [alert, openedAt],
  )

  function goToTable(tableId: string) {
    const card = document.getElementById(tableCardId(tableId))
    card?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    card?.focus({ preventScroll: true })
  }

  return (
    <div className="space-y-12">
      {requests.length > 0 && (
        <div
          role="alert"
          className="sticky top-20 z-10 space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-md"
        >
          <p className="flex items-center gap-2 font-semibold text-amber-900">
            <BellRingingIcon size={18} aria-hidden />
            {requests.length === 1 ? 'Una mesa pide la cuenta' : `${requests.length} mesas piden la cuenta`}
          </p>
          <ul className="flex flex-wrap gap-2">
            {requests.map((request) => (
              <li key={request.bill_id}>
                <Button
                  className="min-h-11 border-amber-300 text-amber-900 hover:border-amber-400 hover:bg-amber-100"
                  onClick={() => goToTable(request.table_id)}
                >
                  <ArrowDownIcon size={16} aria-hidden />
                  {request.table_name} · {clockTime(request.requested_at)}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rejections.length > 0 && (
        <div role="alert" className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <p className="flex items-center gap-2 font-semibold text-red-900">
              <ProhibitIcon size={18} aria-hidden />
              La cocina rechazó {rejections.length === 1 ? 'un platillo' : `${rejections.length} platillos`}. Avísale a la mesa.
            </p>
            <IconButton label="Descartar" icon={<XIcon size={16} aria-hidden />} onClick={() => setRejections([])} />
          </div>
          <ul className="space-y-1 text-sm text-red-900">
            {rejections.map((rejection) => (
              <li key={rejection.id}>
                {rejection.table_name} · Orden #{rejection.order_number} · {rejection.name} — {rejection.note}
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

      <DeliveredNotes notes={delivered} />

      <TablesBoard refreshSignal={tablesSignal} onLoaded={onTablesLoaded} />
    </div>
  )
}
