import { useEffect, useState } from 'react'
import { fetchPublishedTheme, type PublishedTheme } from './api.ts'

/** A published change reaches an open menu within this time, or as soon as the screen is shown again. */
const REFRESH_MS = 60_000

export type PublishedThemeState =
  | { status: 'loading' }
  /** The theme could not be read: the menu keeps the app's neutral look and tries again later. */
  | { status: 'unavailable' }
  | { status: 'loaded'; data: PublishedTheme }

/** The business's published theme for the table menu, kept fresh while the menu stays open. */
export function usePublishedTheme(): PublishedThemeState {
  const [state, setState] = useState<PublishedThemeState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const data = await fetchPublishedTheme()
        if (active) setState({ status: 'loaded', data })
      } catch {
        // Keep the last theme shown; only the first failure falls back to the neutral look.
        if (active) setState((current) => (current.status === 'loaded' ? current : { status: 'unavailable' }))
      }
    }
    function onVisible() {
      if (document.visibilityState === 'visible') void load()
    }
    void load()
    const timer = window.setInterval(() => void load(), REFRESH_MS)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return state
}
