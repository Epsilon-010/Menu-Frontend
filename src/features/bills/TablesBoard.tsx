import { ChairIcon } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { EmptyState, ListSkeleton, LoadError } from '../../shared/ui/Feedback.tsx'
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
import { tablesForWaiter } from './logic.ts'
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

/** Tables with a visit first, each with its orders; the free ones below as small tiles that only open. */
function TableGroups({ tables, card }: { tables: TableOverview[]; card: (table: TableOverview) => ReactNode }) {
  const open = tables.filter((table) => table.bill !== null)
  const free = tables.filter((table) => table.bill === null)
  return (
    <div className="space-y-8">
      {open.length > 0 && <div className="space-y-4">{open.map(card)}</div>}
      {free.length > 0 && (
        <section aria-labelledby="free-tables-title" className="space-y-3">
          <h2 id="free-tables-title" className="text-sm font-semibold text-ink-soft">
            Mesas libres ({free.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{free.map(card)}</div>
        </section>
      )}
    </div>
  )
}

interface TablesBoardProps {
  /** Grows when a live event says the tables changed: the board reloads. */
  refreshSignal?: number
  /** Receives every list that loads (for example to spot newly rejected dishes). */
  onLoaded?: (tables: TableOverview[]) => void
}

/** Waiter view of every table: open it for its guests, follow its orders and take the payment. */
export function TablesBoard({ refreshSignal = 0, onLoaded }: TablesBoardProps = {}) {
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
            card={(table) => <TableBillCard key={table.table_id} table={table} {...handlers(table)} />}
          />
        ))}
    </div>
  )
}
