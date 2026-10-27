import { useEffect } from 'react'
import { fetchAccount } from './api.ts'

const INTERVAL_MS = 30_000

/**
 * Re-checks the session periodically and when the tab regains focus, so a screen with no other
 * traffic notices when the admin deactivates the account: the 401 goes through apiFetch, the
 * refresh fails and the auth provider turns anonymous.
 */
export function useSessionHeartbeat(): void {
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'visible') void fetchAccount().catch(() => null)
    }
    const timer = window.setInterval(check, INTERVAL_MS)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])
}
