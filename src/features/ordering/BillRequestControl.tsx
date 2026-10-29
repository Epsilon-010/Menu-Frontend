import { BellRingingIcon, ReceiptIcon, XIcon } from '@phosphor-icons/react'
import { Button } from '../../shared/ui/Button.tsx'
import { ErrorText } from '../../shared/ui/Feedback.tsx'
import { useRowAction } from '../../shared/ui/useRowAction.ts'
import { clockTime } from './logic.ts'
import type { Loadable } from './useTableOrdering.ts'

interface BillRequestControlProps {
  requestedAt: Loadable<string | null>
  /** Asks for the bill (true) or cancels the request (false); resolves to an error message, or null when done. */
  onChange: (wanted: boolean) => Promise<string | null>
}

/** "Ask for the bill": alerts the waiter once; anyone at the table can cancel it (say, to order dessert). */
export function BillRequestControl({ requestedAt, onChange }: BillRequestControlProps) {
  const { busy, error, run } = useRowAction()
  if (requestedAt.status !== 'loaded') return null
  const asked = requestedAt.data

  return (
    <div aria-busy={busy} className="space-y-2">
      {asked ? (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p role="status" className="flex flex-1 items-center gap-2 text-sm font-medium text-amber-900">
            <BellRingingIcon size={18} aria-hidden />
            Bill requested at {clockTime(asked)}. Your waiter is on the way.
          </p>
          <Button
            variant="ghost"
            icon={<XIcon size={16} aria-hidden />}
            disabled={busy}
            onClick={() => void run(() => onChange(false))}
          >
            {busy ? 'Cancelling…' : 'Cancel request'}
          </Button>
        </div>
      ) : (
        <Button
          variant="secondary"
          icon={<ReceiptIcon size={16} aria-hidden />}
          disabled={busy}
          onClick={() => void run(() => onChange(true))}
        >
          {busy ? 'Asking…' : 'Ask for the bill'}
        </Button>
      )}
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  )
}
