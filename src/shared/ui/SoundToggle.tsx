import { SpeakerHighIcon, SpeakerSlashIcon } from '@phosphor-icons/react'
import { useEffect, useSyncExternalStore } from 'react'
import { isAudioLocked, playBeep, subscribeToAudio, wakeAudio } from '../sound/beep.ts'
import { Button } from './Button.tsx'

interface SoundToggleProps {
  enabled: boolean
  onToggle: () => void
  /** What the sound announces, like "new orders". */
  announces: string
}

export function SoundToggle({ enabled, onToggle, announces }: SoundToggleProps) {
  const audioLocked = useSyncExternalStore(subscribeToAudio, isAudioLocked, () => false)
  const locked = enabled && audioLocked

  // After a reload the preference is still on but the browser holds the audio until someone taps the page.
  useEffect(() => {
    if (!enabled) return
    wakeAudio()
    if (!isAudioLocked()) return
    document.addEventListener('click', wakeAudio)
    return () => document.removeEventListener('click', wakeAudio)
  }, [enabled, locked])

  return (
    <Button
      variant={enabled ? 'primary' : 'secondary'}
      aria-pressed={enabled}
      title={locked ? 'El navegador pausó el sonido al recargar la página' : `Avisar con un sonido cuando haya ${announces}`}
      icon={enabled && !locked ? <SpeakerHighIcon size={16} aria-hidden /> : <SpeakerSlashIcon size={16} aria-hidden />}
      // While the audio is held back, the tap lets it start: turning the preference off is not what it asks for.
      onClick={locked ? playBeep : onToggle}
    >
      {locked ? 'Toca para activar el sonido' : enabled ? 'Sonido activado' : 'Sonido desactivado'}
    </Button>
  )
}
