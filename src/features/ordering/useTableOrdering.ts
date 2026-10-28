import { useCallback, useEffect, useRef, useState } from 'react'
import { createDraftIds, type DraftIds } from '../../shared/api/idempotency.ts'
import {
  addCartLine,
  fetchCart,
  fetchMenu,
  fetchOrders,
  OrderingError,
  removeCartLine,
  submitOrder,
  updateCartLine,
  type Cart,
  type CartLineChanges,
  type MenuCategory,
  type Order,
} from './api.ts'
import { createOrderSender, lineDraftKey, needsCartReload, unavailableNames } from './logic.ts'
import { useTableEvents } from './useTableEvents.ts'

export type Loadable<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'loaded'; data: T }

export type SendResult =
  | { kind: 'sent'; order: Order }
  /** The cart changed after it was reviewed: `cart` is the new one to review (null if it could not load). */
  | { kind: 'changed'; cart: Cart | null }
  | { kind: 'failed'; message: string }

export function messageOf(error: unknown): string {
  return error instanceof OrderingError ? error.message : 'Something went wrong. Please try again.'
}

/**
 * State of the table screen: the menu, the cart every device at the table shares and the orders
 * of this visit, kept current by the live stream (or polling while it is down).
 */
export function useTableOrdering() {
  const [menu, setMenu] = useState<Loadable<MenuCategory[]>>({ status: 'loading' })
  const [menuKey, setMenuKey] = useState(0)
  const [cart, setCart] = useState<Loadable<Cart>>({ status: 'loading' })
  const [orders, setOrders] = useState<Loadable<Order[]>>({ status: 'loading' })

  // Several requests can return the cart at once (writes, reloads): only newer answers replace older ones.
  const cartRequests = useRef(0)
  const cartApplied = useRef(0)
  const ordersRequests = useRef(0)
  const shownVersion = useRef<number | null>(null)
  // One draft id per menu item being added, kept until that add succeeds.
  const lineDrafts = useRef(new Map<string, DraftIds>())
  const [sender] = useState(() => createOrderSender(submitOrder))

  const applyCart = useCallback((request: number, next: Cart) => {
    if (request <= cartApplied.current) return
    cartApplied.current = request
    shownVersion.current = next.version
    setCart({ status: 'loaded', data: next })
  }, [])

  /** Runs a request that answers with the whole cart and shows it, unless a newer answer arrived first. */
  const withCart = useCallback(
    async (request: () => Promise<Cart>): Promise<Cart> => {
      cartRequests.current += 1
      const id = cartRequests.current
      const next = await request()
      applyCart(id, next)
      return next
    },
    [applyCart],
  )

  const reloadCart = useCallback(async (): Promise<Cart | null> => {
    try {
      return await withCart(fetchCart)
    } catch (error) {
      // Keep showing the last cart; only a first load without data shows the error.
      setCart((current) => (current.status === 'loaded' ? current : { status: 'error', message: messageOf(error) }))
      return null
    }
  }, [withCart])

  const reloadOrders = useCallback(async () => {
    ordersRequests.current += 1
    const id = ordersRequests.current
    try {
      const next = await fetchOrders()
      if (id === ordersRequests.current) setOrders({ status: 'loaded', data: next })
    } catch (error) {
      if (id === ordersRequests.current) {
        setOrders((current) => (current.status === 'loaded' ? current : { status: 'error', message: messageOf(error) }))
      }
    }
  }, [])

  const refresh = useCallback(() => {
    void reloadCart()
    void reloadOrders()
  }, [reloadCart, reloadOrders])

  useEffect(() => {
    let active = true
    fetchMenu()
      .then((data) => {
        if (active) setMenu({ status: 'loaded', data })
      })
      .catch((error: unknown) => {
        if (active) setMenu({ status: 'error', message: messageOf(error) })
      })
    return () => {
      active = false
    }
  }, [menuKey])

  // The live hook loads the cart and orders on mount and again on every (re)connection.
  useTableEvents({
    onCartVersion: (version) => {
      if (needsCartReload(version, shownVersion.current)) void reloadCart()
    },
    onOrders: () => void reloadOrders(),
    onRefresh: refresh,
  })

  function retryMenu() {
    setMenu({ status: 'loading' })
    setMenuKey((key) => key + 1)
  }

  function retryCart() {
    setCart({ status: 'loading' })
    setOrders({ status: 'loading' })
    refresh()
  }

  function draftsFor(itemId: string): DraftIds {
    let drafts = lineDrafts.current.get(itemId)
    if (!drafts) {
      drafts = createDraftIds()
      lineDrafts.current.set(itemId, drafts)
    }
    return drafts
  }

  /** Each change resolves to an error message, or null when it was saved. */
  async function addLine(itemId: string, quantity: number, note: string): Promise<string | null> {
    const drafts = draftsFor(itemId)
    const id = drafts.idFor(lineDraftKey(itemId, quantity, note))
    try {
      await withCart(() => addCartLine({ id, item_id: itemId, quantity, note: note.trim() }))
      drafts.reset()
      return null
    } catch (error) {
      return describeUnavailable(error)
    }
  }

  async function changeLine(lineId: string, changes: CartLineChanges): Promise<string | null> {
    try {
      await withCart(() => updateCartLine(lineId, changes))
      return null
    } catch (error) {
      // Someone else removed the line meanwhile: show the cart as it is now.
      if (error instanceof OrderingError && error.status === 404) void reloadCart()
      return describeUnavailable(error)
    }
  }

  async function removeLine(lineId: string): Promise<string | null> {
    try {
      await withCart(() => removeCartLine(lineId))
      return null
    } catch (error) {
      return messageOf(error)
    }
  }

  function describeUnavailable(error: unknown): string {
    if (error instanceof OrderingError && error.unavailableItemIds.length > 0) {
      const lines = cart.status === 'loaded' ? cart.data.lines : []
      const names = unavailableNames(lines, error.unavailableItemIds)
      void reloadCart()
      return names.length > 0
        ? `${names.join(', ')} ${names.length === 1 ? 'is' : 'are'} no longer available. Remove ${names.length === 1 ? 'it' : 'them'} and try again.`
        : 'That item is no longer available.'
    }
    return messageOf(error)
  }

  /** Sends the cart version the sender reviewed as one order. */
  async function send(reviewedVersion: number): Promise<SendResult> {
    try {
      const order = await sender.send(reviewedVersion)
      refresh()
      return { kind: 'sent', order }
    } catch (error) {
      if (error instanceof OrderingError && error.cartChanged) return { kind: 'changed', cart: await reloadCart() }
      return { kind: 'failed', message: describeUnavailable(error) }
    }
  }

  return { menu, cart, orders, retryMenu, retryCart, reloadCart, addLine, changeLine, removeLine, send }
}

export type TableOrdering = ReturnType<typeof useTableOrdering>
