import { ChairIcon } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { EmptyState, ListSkeleton, LoadError } from '../../shared/ui/Feedback.tsx'
import { SectionHeader } from '../../shared/ui/Section.tsx'
import { OrdersError, updateItemStatus } from '../kitchen/api.ts'
import {
  addOrderDish,
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

type ListState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'loaded'; tables: TableOverview[] }

function messageOf(error: unknown): string {
  return error instanceof BillError || error instanceof OrdersError
    ? error.message
    : 'Algo salió mal. Inténtalo de nuevo.'
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
      void reload()
      return messageOf(error)
    }
    if (!(await reload())) setStale(true)
    return null
  }

  function handlers(table: TableOverview) {
    const bill = table.bill
    return {
      onOpen: () => act(() => openTable(table.table_id)),
      onPay: (method: PaymentMethod) =>
        bill ? act(() => registerPayment(bill.id, method)) : Promise.resolve('Esta mesa no está abierta.'),
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
        description="Abre una mesa para que los comensales entren con su QR y pidan desde su celular. Al registrar el pago se cierra la cuenta y se cierra la sesión de todos los comensales."
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
          <div className="space-y-4">
            {tablesForWaiter(list.tables).map((table) => (
              <TableBillCard key={table.table_id} table={table} {...handlers(table)} />
            ))}
          </div>
        ))}
    </div>
  )
}
