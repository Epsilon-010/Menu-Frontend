/**
 * Remembers on this device that the last session was a guest's, so that after the visit ends
 * (even across a reload) the guest sees the "visit ended" screen instead of the staff sign in.
 * Storage can be unavailable (private mode); then the marker simply does nothing.
 */
const KEY = 'menu.guest-visit'

export function rememberGuestVisit(active: boolean): void {
  try {
    if (active) window.localStorage.setItem(KEY, '1')
    else window.localStorage.removeItem(KEY)
  } catch {
    // Storage blocked: the visit-ended screen still shows until the page reloads.
  }
}

export function hadGuestVisit(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
