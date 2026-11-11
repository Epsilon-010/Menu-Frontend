import { ArrowDownIcon, BellRingingIcon, ProhibitIcon, XIcon } from '@phosphor-icons/react'
import { useCallback, useRef, useState } from 'react'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group.tsx'
import { IconButton } from '../../shared/ui/Button.tsx'
import { PILL, PILL_GROUP } from '../../shared/ui/pills.ts'
import { useNow } from '../../shared/ui/useNow.ts'
import { useSoundAlert } from '../../shared/sound/useSoundAlert.ts'
import type { TableOverview } from '../bills/api.ts'
import {
  billRequests,
  newBillRequests,
  nextTableChoice,
  tableCardId,
  tableIdOf,
  withoutTable,
  type BillRequest,
  type TableChoice,
} from '../bills/logic.ts'
import { TablesBoard } from '../bills/TablesBoard.tsx'
import { useStaffEvents } from '../kitchen/useStaffEvents.ts'
import { useStaffQueue } from '../kitchen/useStaffQueue.ts'
import { clockTime } from '../ordering/logic.ts'
import { useLateOrderMinutes } from '../settings/useLateOrderMinutes.ts'
import { fetchDeliveries } from './api.ts'
import { DeliveryQueue } from './DeliveryQueue.tsx'
import { DeliveredNotes } from './DeliveredNotes.tsx'
import { deliveredNotes, hasReady, newRejections, readyIds, type DeliveredNote, type Rejection } from './logic.ts'

type ServiceTab = 'deliveries' | 'tables'

/**
 * The waiter's screen in two views: what to take to the tables, and the tables with their bills. Both stay
 * loaded, so a table asking for its bill or a dish getting ready is announced whichever one is open.
 */
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
  const [tab, setTab] = useState<ServiceTab>('deliveries')
  const [openTables, setOpenTables] = useState(0)
  const [focus, setFocus] = useState<TableChoice | null>(null)

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
      setOpenTables(tables.filter((table) => table.bill !== null).length)
      if (asked.fresh > 0) alert()
    },
    [alert, openedAt],
  )

  function goToTable(tableId: string) {
    setTab('tables')
    // On a wide screen only the chosen table's bill is drawn: choose it before looking for its card.
    setFocus({ tableId, at: nextTableChoice() })
    // The tables view may have been hidden until now: wait for it to be laid out before scrolling to the card.
    window.requestAnimationFrame(() => {
      const card = document.getElementById(tableCardId(tableId))
      card?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      card?.focus({ preventScroll: true })
    })
  }

  const ready = queue.list.status === 'loaded' ? readyIds(queue.list.orders).length : 0

  return (
    <div className="space-y-8">
      {requests.length > 0 && (
        <div
          role="alert"
          className="sticky top-20 z-10 space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-md lg:top-4"
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
              La cocina rechazó {rejections.length === 1 ? 'un platillo' : `${rejections.length} platillos`}. Avísale a
              la mesa.
            </p>
            <IconButton label="Descartar" icon={<XIcon size={16} aria-hidden />} onClick={() => setRejections([])} />
          </div>
          <ul className="space-y-1 text-sm text-red-900">
            {rejections.map((rejection) => (
              <li key={rejection.id}>
                {rejection.table_name} · Orden #{rejection.order_number} · {rejection.name}. Motivo: {rejection.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ToggleGroup
        type="single"
        width="full"
        className={`${PILL_GROUP} sm:inline-flex sm:w-auto`}
        value={tab}
        aria-label="Vista"
        // Pressing the chosen view again would clear it; one view is always open.
        onValueChange={(next) => next && setTab(next as ServiceTab)}
      >
        <ToggleGroupItem value="deliveries" className={PILL}>
          Entregas
          {ready > 0 && <Badge variant="success">{ready}</Badge>}
        </ToggleGroupItem>
        <ToggleGroupItem value="tables" className={PILL}>
          Mesas
          {openTables > 0 && <Badge variant="default">{openTables === 1 ? '1 abierta' : `${openTables} abiertas`}</Badge>}
        </ToggleGroupItem>
      </ToggleGroup>

      <div hidden={tab !== 'deliveries'} className="space-y-12">
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
      </div>

      <div hidden={tab !== 'tables'}>
        <TablesBoard refreshSignal={tablesSignal} onLoaded={onTablesLoaded} focus={focus} />
      </div>
    </div>
  )
}
