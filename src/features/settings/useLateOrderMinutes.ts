import { useEffect, useState } from 'react'
import { DEFAULT_LATE_ORDER_MINUTES, fetchOrderSettings } from './api.ts'

/** The business threshold for late orders; the default until it loads (or if it cannot). */
export function useLateOrderMinutes(): number {
  const [minutes, setMinutes] = useState(DEFAULT_LATE_ORDER_MINUTES)
  useEffect(() => {
    let active = true
    fetchOrderSettings()
      .then((settings) => {
        if (active) setMinutes(settings.late_order_minutes)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])
  return minutes
}
