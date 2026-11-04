import { InfoIcon, XIcon } from '@phosphor-icons/react'
import { IconButton } from '../../shared/ui/Button.tsx'

/** Board-level message, like "Some dishes already changed; reload the order." after a reload. */
export function QueueNotice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="flex items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
    >
      <span className="flex items-start gap-2">
        <InfoIcon size={18} className="mt-0.5 shrink-0" aria-hidden />
        <span>{message} Se recargó la pantalla.</span>
      </span>
      <IconButton label="Descartar" icon={<XIcon size={16} aria-hidden />} onClick={onDismiss} />
    </div>
  )
}
