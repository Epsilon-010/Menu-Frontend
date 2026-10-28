import { SpeakerHighIcon, SpeakerSlashIcon } from '@phosphor-icons/react'
import { Button } from './Button.tsx'

interface SoundToggleProps {
  enabled: boolean
  onToggle: () => void
  /** What the sound announces, like "new orders". */
  announces: string
}

export function SoundToggle({ enabled, onToggle, announces }: SoundToggleProps) {
  return (
    <Button
      variant={enabled ? 'primary' : 'secondary'}
      aria-pressed={enabled}
      title={`Play a sound for ${announces}`}
      icon={enabled ? <SpeakerHighIcon size={16} aria-hidden /> : <SpeakerSlashIcon size={16} aria-hidden />}
      onClick={onToggle}
    >
      {enabled ? 'Sound on' : 'Sound off'}
    </Button>
  )
}
