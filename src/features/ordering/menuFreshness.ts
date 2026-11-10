/** How the open menu stays current: the same schedule `usePublishedTheme` follows for the theme. */
type MenuState<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'loaded'; data: T }

/** A change reaches an open menu within this time, or as soon as the screen is shown again. */
export const MENU_REFRESH_MS = 60_000

/** Runs `load` on the schedule and returns how to stop it. */
export function scheduleMenuRefresh(load: () => void): () => void {
  function onVisible() {
    if (document.visibilityState === 'visible') load()
  }
  const timer = window.setInterval(load, MENU_REFRESH_MS)
  document.addEventListener('visibilitychange', onVisible)
  return () => {
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
  }
}

/** The new menu, or the same object when nothing changed, so a refresh does not disturb an open card. */
export function menuAfterLoad<T>(current: MenuState<T>, data: T): MenuState<T> {
  if (current.status === 'loaded' && JSON.stringify(current.data) === JSON.stringify(data)) return current
  return { status: 'loaded', data }
}

/** A refresh that fails keeps the menu on screen; only a menu that never loaded shows the error. */
export function menuAfterFailure<T>(current: MenuState<T>, message: string): MenuState<T> {
  return current.status === 'loaded' ? current : { status: 'error', message }
}
