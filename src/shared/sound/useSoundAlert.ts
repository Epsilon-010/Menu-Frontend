import { useCallback, useEffect, useRef, useState } from 'react'
import { playBeep } from './beep.ts'
import { readSoundEnabled, writeSoundEnabled } from './preference.ts'

/**
 * Optional alert sound of a staff screen, off until someone turns it on in this browser.
 * `alert` plays only while it is on.
 */
export function useSoundAlert(screen: string) {
  const [enabled, setEnabled] = useState(() => readSoundEnabled(screen))
  const latest = useRef(enabled)
  useEffect(() => {
    latest.current = enabled
  })

  function toggle() {
    const next = !enabled
    setEnabled(next)
    writeSoundEnabled(screen, next)
    // Playing right away confirms it works and unlocks audio with this tap.
    if (next) playBeep()
  }

  const alert = useCallback(() => {
    if (latest.current) playBeep()
  }, [])

  return { enabled, toggle, alert }
}
