import { ChairIcon } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { EmptyState, ListSkeleton, LoadError } from '../../shared/ui/Feedback.tsx'
import { SectionHeader } from '../../shared/ui/Section.tsx'
import {
  BillError,
  closeTable,
  listTableBills,
  openTable,
  registerPayment,
  type PaymentMethod,
  type TableOverview,
} from './api.ts'
import { TableBillCard } from './TableBillCard.tsx'

const REFRESH_MS = 10_000
const STALE = 'Saved, but the list could not refresh. It updates again in a few seconds.'

type ListState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'loaded'; tables: TableOverview[] }

function messageOf(error: unknown): string {
  return error instanceof BillError ? error.message : 'Something went wrong. Please try again.'
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
        bill ? act(() => registerPayment(bill.id, method)) : Promise.resolve('This table is not open.'),
      onClose: () => (bill ? act(() => closeTable(bill.id)) : Promise.resolve(null)),
    }
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Tables"
        description="Open a table so guests can join with its QR and order from their phones. Registering the payment closes the bill and signs every guest out."
      />

      {stale && (
        <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          {STALE}
        </p>
      )}

      {list.status === 'loading' && <ListSkeleton label="Loading tables" />}
      {list.status === 'error' && <LoadError message={list.message} onRetry={retry} />}
      {list.status === 'loaded' &&
        (list.tables.length === 0 ? (
          <EmptyState icon={<ChairIcon size={24} aria-hidden />} title="No tables yet">
            The manager adds the tables in the admin panel. They show up here right after.
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {list.tables.map((table) => (
              <TableBillCard key={table.table_id} table={table} {...handlers(table)} />
            ))}
          </div>
        ))}
    </div>
  )
}
