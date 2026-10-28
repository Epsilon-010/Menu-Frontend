import { useEffect, useRef } from 'react'
import { reconnectDelay } from './logic.ts'

/** While the live stream is down, the screen asks for changes this often. */
export const POLL_INTERVAL_MS = 5_000

export interface LiveEventsOptions {
  /** Same-origin SSE endpoint, like `/api/v1/table/events` (the session cookies go along). */
  url: string
  /** One handler per event name; the names are read when the stream opens. */
  events: Record<string, (data: string) => void>
  /** Reload everything: the stream (re)connected, the tab came back, or a poll while the stream is down. */
  onRefresh: () => void
}

/**
 * Live updates over Server-Sent Events, shared by the table and the staff screens.
 *
 * The server closes the stream every few minutes by design. On any error the stream is closed,
 * the screen polls every 5 s and the stream is reopened with a growing delay. Polling goes through
 * the HTTP client, which also renews an expired access cookie before the stream reconnects.
 */
export function useLiveEvents({ url, events, onRefresh }: LiveEventsOptions): void {
  const latest = useRef({ events, onRefresh })
  useEffect(() => {
    latest.current = { events, onRefresh }
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
      const stream = new EventSource(url)
      source = stream
      stream.addEventListener('open', () => {
        attempt = 0
        stopPolling()
        // Anything that happened while disconnected is picked up from the API.
        refresh()
      })
      for (const name of Object.keys(latest.current.events)) {
        stream.addEventListener(name, (event) => {
          // The newest handler runs, so callers may pass a fresh object on every render.
          latest.current.events[name]?.((event as MessageEvent<string>).data)
        })
      }
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
  }, [url])
}
