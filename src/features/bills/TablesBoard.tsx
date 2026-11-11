import { BellRingingIcon, ChairIcon, CircleIcon } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Badge } from '../../components/ui/badge.tsx'
import { cn } from '../../lib/utils.ts'
import { MOTION } from '../../shared/ui/classes.ts'
import { EmptyState, ListSkeleton, LoadError } from '../../shared/ui/Feedback.tsx'
import { useMediaQuery } from '../../shared/ui/useMediaQuery.ts'
import { formatMoney } from '../catalog/price.ts'
import { clockTime } from '../ordering/logic.ts'
import { SectionHeader } from '../../shared/ui/Section.tsx'
import { OrdersError, updateItemStatus } from '../kitchen/api.ts'
import {
  addOrderDish,
  BillChangedError,
  BillError,
  closeTable,
  dismissBillRequest,
  listTableBills,
  openTable,
  registerPayment,
  type NewOrderDish,
  type PaymentMethod,
  type TableOverview,
} from './api.ts'
import { latestTableChoice, nextTableChoice, shownOpenTable, tablesForWaiter, type TableChoice } from './logic.ts'
import { TableBillCard } from './TableBillCard.tsx'

const REFRESH_MS = 10_000
const STALE = 'Se guardó, pero la lista no se pudo actualizar. Se actualiza de nuevo en unos segundos.'

type ListState =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'loaded'; tables: TableOverview[] }

function messageOf(error: unknown): string {
  return error instanceof BillError || error instanceof OrdersError
    ? error.message
    : 'Algo salió mal. Inténtalo de nuevo.'
}

/** One open table in the list of the wide layout: who it is, how much it owes and whether it asked for the bill. */
function OpenTableRow({ table, selected, onSelect }: { table: TableOverview; selected: boolean; onSelect: () => void }) {
  const bill = table.bill
  if (!bill) return null
  const openedAt = clockTime(bill.opened_at)
  const orders = bill.orders.length
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-4 rounded-2xl border bg-surface p-4 text-left active:scale-[0.99]',
        MOTION,
        selected
          ? 'border-brand shadow-lg shadow-brand/10 ring-1 ring-brand'
          : 'border-transparent shadow-sm shadow-brand/5 hover:-translate-y-0.5 hover:shadow-md',
      )}
    >
      <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', selected ? 'bg-brand text-brand-ink' : 'bg-brand/10 text-brand')}>
        <ChairIcon size={24} weight="fill" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block truncate text-lg font-semibold text-ink">{table.table_name}</span>
        <span className="block text-sm text-muted">
          {orders === 1 ? '1 orden' : `${orders} órdenes`}
          {openedAt && ` · Abierta a las ${openedAt}`}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-xl font-semibold text-ink tabular-nums">{formatMoney(bill.total_cents)}</span>
        {bill.bill_requested_at ? (
          <Badge variant="warning">
            <BellRingingIcon size={14} aria-hidden />
            Pide la cuenta
          </Badge>
        ) : (
          <Badge variant="success">
            <CircleIcon size={8} weight="fill" aria-hidden />
            Abierta
          </Badge>
        )}
      </span>
    </button>
  )
}

interface TableGroupsProps {
  tables: TableOverview[]
  card: (table: TableOverview) => ReactNode
  /** Wide screens: the open tables as a list and only the chosen one's bill beside it. */
  split: boolean
  selectedId: string | null
  onSelect: (tableId: string) => void
}

/** Tables with a visit first, each with its orders; the free ones below as small tiles that only open. */
function TableGroups({ tables, card, split, selectedId, onSelect }: TableGroupsProps) {
  const open = tables.filter((table) => table.bill !== null)
  const free = tables.filter((table) => table.bill === null)
  const freeTables = free.length > 0 && (
    <section aria-labelledby="free-tables-title" className="space-y-3">
      <h2 id="free-tables-title" className="text-sm font-semibold text-ink-soft">
        Mesas libres ({free.length})
      </h2>
      <div className={cn('grid gap-3 sm:grid-cols-2', !split && 'lg:grid-cols-3')}>{free.map(card)}</div>
    </section>
  )

  const selected = shownOpenTable(open, selectedId)
  if (!split || selected === null) {
    return (
      <div className="space-y-8">
        {open.length > 0 && <div className="space-y-4">{open.map(card)}</div>}
        {freeTables}
      </div>
    )
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="space-y-8">
        <ul aria-label="Mesas abiertas" className="space-y-3">
          {open.map((table) => (
            <li key={table.table_id}>
              <OpenTableRow table={table} selected={table === selected} onSelect={() => onSelect(table.table_id)} />
            </li>
          ))}
        </ul>
        {freeTables}
      </div>
      <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl">{card(selected)}</div>
    </div>
  )
}

interface TablesBoardProps {
  /** Grows when a live event says the tables changed: the board reloads. */
  refreshSignal?: number
  /** Receives every list that loads (for example to spot newly rejected dishes). */
  onLoaded?: (tables: TableOverview[]) => void
  /** The table to show on the wide layout, chosen outside the board; a later click on the list replaces it. */
  focus?: TableChoice | null
}

/** Waiter view of every table: open it for its guests, follow its orders and take the payment. */
export function TablesBoard({ refreshSignal = 0, onLoaded, focus = null }: TablesBoardProps = {}) {
  const split = useMediaQuery('(min-width: 80rem)')
  const [picked, setPicked] = useState<TableChoice | null>(null)
  const selectedId = latestTableChoice(focus, picked)
  const [list, setList] = useState<ListState>({ status: 'loading' })
  const [stale, setStale] = useState(false)
  const requests = useRef(0)
  const loaded = useRef(onLoaded)
  useEffect(() => {
    loaded.current = onLoaded
  })

  /** Resolves to true when the list loaded; only the newest request is shown. */
  const reload = useCallback(async (): Promise<boolean> => {
    requests.current += 1
    const id = requests.current
    try {
      const tables = await listTableBills()
      if (id === requests.current) {
        setList({ status: 'loaded', tables })
        setStale(false)
        loaded.current?.(tables)
      }
      return true
    } catch (error) {
      if (id === requests.current) {
        setList((current) => (current.status === 'loaded' ? current : { status: 'error', message: messageOf(error) }))
      }
      return false
    }
  }, [])

  useEffect(() => {
    // The first load and the periodic refresh run from timers, never synchronously inside the effect.
    const first = window.setTimeout(() => void reload(), 0)
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void reload()
    }, REFRESH_MS)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(timer)
    }
  }, [reload])

  useEffect(() => {
    if (refreshSignal === 0) return
    const timer = window.setTimeout(() => void reload(), 0)
    return () => window.clearTimeout(timer)
  }, [refreshSignal, reload])

  function retry() {
    setList({ status: 'loading' })
    void reload()
  }

  /** Runs an action, then refreshes; a failed refresh after a saved action is still a success. */
  async function act(action: () => Promise<unknown>): Promise<string | null> {
    try {
      await action()
    } catch (error) {
      // The waiter is asked to confirm the new total, so it must be on screen before the question.
      if (error instanceof BillChangedError) await reload()
      else void reload()
      return messageOf(error)
    }
    if (!(await reload())) setStale(true)
    return null
  }

  function handlers(table: TableOverview) {
    const bill = table.bill
    return {
      onOpen: () => act(() => openTable(table.table_id)),
      onPay: (method: PaymentMethod, expectedTotalCents: number, onlyDelivered: boolean) =>
        bill
          ? act(() => registerPayment(bill.id, method, expectedTotalCents, onlyDelivered))
          : Promise.resolve('Esta mesa no está abierta.'),
      onClose: () => (bill ? act(() => closeTable(bill.id)) : Promise.resolve(null)),
      onDismissRequest: () => (bill ? act(() => dismissBillRequest(bill.id)) : Promise.resolve(null)),
      onCancelDish: (orderId: string, itemId: string, reason: string) =>
        act(() => updateItemStatus(orderId, [itemId], 'cancelled', reason)),
      onAddDish: (orderId: string, dish: NewOrderDish) => act(() => addOrderDish(orderId, dish)),
    }
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        icon={<ChairIcon size={24} weight="fill" aria-hidden />}
        title="Mesas"
        description="Una mesa se abre sola cuando alguien escanea su QR. Al registrar el pago se cierra la cuenta y la sesión de sus comensales."
      />

      {stale && (
        <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          {STALE}
        </p>
      )}

      {list.status === 'loading' && <ListSkeleton label="Cargando mesas" />}
      {list.status === 'error' && <LoadError message={list.message} onRetry={retry} />}
      {list.status === 'loaded' &&
        (list.tables.length === 0 ? (
          <EmptyState icon={<ChairIcon size={24} aria-hidden />} title="Aún no hay mesas">
            El administrador agrega las mesas en el panel de administración. Aparecen aquí en cuanto las agrega.
          </EmptyState>
        ) : (
          <TableGroups
            tables={tablesForWaiter(list.tables)}
            split={split}
            selectedId={selectedId}
            onSelect={(tableId) => setPicked({ tableId, at: nextTableChoice() })}
            card={(table) => <TableBillCard key={table.table_id} table={table} {...handlers(table)} />}
          />
        ))}
    </div>
  )
}
