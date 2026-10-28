import { XIcon } from '@phosphor-icons/react'
import { IconButton } from '../../shared/ui/Button.tsx'

/** Board-level message, like "Some dishes already changed; reload the order." after a reload. */
export function QueueNotice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div role="status" className="flex items-start justify-between gap-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
      <span>{message} The screen was reloaded.</span>
      <IconButton label="Dismiss" icon={<XIcon size={16} aria-hidden />} onClick={onDismiss} />
    </div>
  )
}
