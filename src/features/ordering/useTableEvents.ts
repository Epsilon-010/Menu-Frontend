import { useEffect, useRef } from 'react'
import { cartVersionOf, reconnectDelay } from './logic.ts'

const EVENTS_URL = '/api/v1/table/events'
/** While the live stream is down, the screen asks for changes this often. */
export const POLL_INTERVAL_MS = 5_000

export interface TableEventHandlers {
  /** `cart.updated`: another device changed the shared cart to this version. */
  onCartVersion: (version: number) => void
  /** `order.created`: someone at the table sent an order. */
  onOrders: () => void
  /** Reload everything: the stream (re)connected, the tab came back, a bill opened or closed, or a poll. */
  onRefresh: () => void
}

/**
 * Live updates of the table over Server-Sent Events (same origin, so the session cookies go along).
 *
 * The server closes the stream every few minutes by design. On any error the stream is closed,
 * the screen polls every 5 s and the stream is reopened with a growing delay. Polling goes through
 * the HTTP client, which also renews an expired access cookie before the stream reconnects.
 */
export function useTableEvents(handlers: TableEventHandlers): void {
  const latest = useRef(handlers)
  useEffect(() => {
    latest.current = handlers
  })

  useEffect(() => {
    let source: EventSource | null = null
    let reconnectTimer: number | undefined
    let pollTimer: number | undefined
    let attempt = 0
    let stopped = false

    const refresh = () => latest.current.onRefresh()

    function stopPolling() {
      window.clearInterval(pollTimer)
      pollTimer = undefined
    }

    function startPolling() {
      if (pollTimer !== undefined) return
      refresh()
      pollTimer = window.setInterval(refresh, POLL_INTERVAL_MS)
    }

    function connect() {
      if (stopped) return
      const stream = new EventSource(EVENTS_URL)
      source = stream
      stream.addEventListener('open', () => {
        attempt = 0
        stopPolling()
        // Anything that happened while disconnected is picked up from the API.
        refresh()
      })
      stream.addEventListener('cart.updated', (event) => {
        const version = cartVersionOf((event as MessageEvent<string>).data)
        if (version === null) refresh()
        else latest.current.onCartVersion(version)
      })
      stream.addEventListener('order.created', () => latest.current.onOrders())
      stream.addEventListener('bill.opened', refresh)
      stream.addEventListener('bill.closed', refresh)
      stream.addEventListener('error', () => {
        stream.close()
        if (source === stream) source = null
        if (stopped) return
        startPolling()
        window.clearTimeout(reconnectTimer)
        reconnectTimer = window.setTimeout(connect, reconnectDelay(attempt))
        attempt += 1
      })
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    if (typeof EventSource === 'undefined') {
      startPolling()
    } else {
      // Load right away instead of waiting for the stream to open (a slow proxy must not leave the screen empty).
      refresh()
      connect()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      stopped = true
      source?.close()
      window.clearTimeout(reconnectTimer)
      stopPolling()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
}
