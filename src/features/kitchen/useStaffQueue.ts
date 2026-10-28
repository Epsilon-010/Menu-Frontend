import { useCallback, useEffect, useRef, useState } from 'react'
import { OrdersError, updateItemStatus, type ItemTarget, type StaffOrder } from './api.ts'
import { chunk, MAX_ITEMS_PER_CHANGE, newIds, replaceOrder } from './logic.ts'

export type QueueState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; orders: StaffOrder[] }

export function messageOf(error: unknown): string {
  return error instanceof OrdersError ? error.message : 'Something went wrong. Please try again.'
}

interface StaffQueueOptions {
  load: () => Promise<StaffOrder[]>
  /** Whether an order still belongs on this screen after one of its dishes changed. */
  keep: (order: StaffOrder) => boolean
  /** Ids whose first appearance plays the alert (new orders for the kitchen, ready dishes for waiters). */
  alertIds: (orders: StaffOrder[]) => string[]
  onNew: () => void
}

/**
 * One staff queue (kitchen or deliveries): loads it, keeps only the newest answer, alerts on
 * what is new and moves dishes. Postgres is the source of truth: every change ends in a reload.
 */
export function useStaffQueue(options: StaffQueueOptions) {
  const [list, setList] = useState<QueueState>({ status: 'loading' })
  const [notice, setNotice] = useState<string | null>(null)
  const requests = useRef(0)
  const seen = useRef<Set<string> | null>(null)
  const latest = useRef(options)
  useEffect(() => {
    latest.current = options
  })

  const reload = useCallback(async () => {
    requests.current += 1
    const id = requests.current
    try {
      const orders = await latest.current.load()
      if (id !== requests.current) return
      const ids = latest.current.alertIds(orders)
      if (newIds(seen.current, ids).length > 0) latest.current.onNew()
      seen.current = new Set(ids)
      setList({ status: 'loaded', orders })
    } catch (error) {
      if (id === requests.current) {
        // Keep showing the last queue; only a first load without data shows the error.
        setList((current) => (current.status === 'loaded' ? current : { status: 'error', message: messageOf(error) }))
      }
    }
  }, [])

  const retry = useCallback(() => {
    setList({ status: 'loading' })
    void reload()
  }, [reload])

  /**
   * Moves dishes of one order. Resolves to an error message for the card, or null when done.
   * When someone else moved a dish first, nothing changed: the queue reloads and the board says why.
   */
  const act = useCallback(
    async (orderId: string, itemIds: string[], target: ItemTarget, reason?: string): Promise<string | null> => {
      try {
        for (const ids of chunk(itemIds, MAX_ITEMS_PER_CHANGE)) {
          const updated = await updateItemStatus(orderId, ids, target, reason)
          setList((current) =>
            current.status === 'loaded'
              ? { status: 'loaded', orders: replaceOrder(current.orders, updated, latest.current.keep) }
              : current,
          )
        }
        setNotice(null)
        void reload()
        return null
      } catch (error) {
        void reload()
        if (error instanceof OrdersError && error.dishesChanged) {
          setNotice(error.message)
          return null
        }
        return messageOf(error)
      }
    },
    [reload],
  )

  const dismissNotice = useCallback(() => setNotice(null), [])

  return { list, reload, retry, act, notice, dismissNotice }
}
