/**
 * Remembers on this device that the last session was a guest's, so that after the visit ends
 * (even across a reload) the guest sees the "visit ended" screen instead of the staff sign in.
 * Storage can be unavailable (private mode); then the marker simply does nothing.
 */
const KEY = 'menu.guest-visit'
/** The QR of the table the guest joined. The session does not carry it, and a scan has to tell the tables apart. */
const QR_KEY = 'menu.guest-qr'

export function rememberGuestVisit(active: boolean): void {
  try {
    if (active) window.localStorage.setItem(KEY, '1')
    else {
      window.localStorage.removeItem(KEY)
      window.localStorage.removeItem(QR_KEY)
    }
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

export function rememberGuestQr(token: string): void {
  try {
    window.localStorage.setItem(QR_KEY, token)
  } catch {
    // Storage blocked: the next scan shows the join form, which still works.
  }
}

/** False also when the device cannot tell: joining again is harmless, ordering at the wrong table is not. */
export function joinedWithQr(token: string): boolean {
  try {
    return window.localStorage.getItem(QR_KEY) === token
  } catch {
    return false
  }
}
