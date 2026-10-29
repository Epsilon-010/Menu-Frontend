import { PaperPlaneTiltIcon, WarningIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { ErrorText } from '../../shared/ui/Feedback.tsx'
import { formatMoney } from '../catalog/price.ts'
import type { Cart, Order } from './api.ts'
import { groupByPerson } from './logic.ts'
import type { SendResult } from './useTableOrdering.ts'

interface SendConfirmationProps {
  /** The cart as it is now; it may change while the sender reviews. */
  liveCart: Cart
  onSend: (reviewedVersion: number) => Promise<SendResult>
  onSent: (order: Order) => void
  onClose: () => void
}

/**
 * Full summary the sender confirms. It shows the cart as it was when opened (the reviewed
 * version); if someone changes the cart meanwhile, the sender is told and reviews it again.
 */
export function SendConfirmation({ liveCart, onSend, onSent, onClose }: SendConfirmationProps) {
  const [reviewed, setReviewed] = useState<Cart>(liveCart)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [changedNotice, setChangedNotice] = useState(false)
  const outdated = liveCart.version !== reviewed.version

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [busy, onClose])

  function reviewLatest(cart: Cart) {
    setReviewed(cart)
    setChangedNotice(true)
    setError(null)
  }

  async function handleConfirm() {
    setBusy(true)
    setError(null)
    const result = await onSend(reviewed.version)
    setBusy(false)
    if (result.kind === 'sent') onSent(result.order)
    else if (result.kind === 'changed') {
      if (result.cart) reviewLatest(result.cart)
      else setError('The order changed and could not be reloaded. Check your connection and try again.')
    } else setError(result.message)
  }

  const groups = groupByPerson(reviewed.lines)
  const hasDishes = reviewed.lines.some((line) => line.available)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-title"
        className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-lg"
      >
        <div className="space-y-1 p-6 pb-4">
          <h2 id="send-title" className="text-xl font-semibold tracking-tight text-ink">
            Review the order before sending
          </h2>
          <p className="text-sm text-muted">It goes straight to the kitchen for the whole table.</p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6">
          {changedNotice && !outdated && (
            <p role="status" className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              <WarningIcon size={16} className="mt-0.5 shrink-0" aria-hidden />
              Someone at the table changed the order. This is the latest version; review it again before sending.
            </p>
          )}
          {outdated && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 p-3">
              <p className="flex items-start gap-2 text-sm text-amber-900">
                <WarningIcon size={16} className="mt-0.5 shrink-0" aria-hidden />
                Someone just changed the order.
              </p>
              <Button variant="secondary" onClick={() => reviewLatest(liveCart)} disabled={busy}>
                Show the changes
              </Button>
            </div>
          )}

          {groups.map((group) => (
            <section key={group.person} className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{group.person}</h3>
                <span className="text-xs text-muted tabular-nums">{formatMoney(group.subtotal_cents)}</span>
              </div>
              <ul className="space-y-2">
                {group.lines.map((line) => (
                  <li key={line.id} className="flex items-start justify-between gap-4 text-sm">
                    <div className="min-w-0">
                      <p className={line.available ? 'text-ink' : 'text-faint line-through'}>
                        <span className="font-semibold tabular-nums">{line.quantity} ×</span> {line.name}
                      </p>
                      {line.note && <p className="text-muted">{line.note}</p>}
                      {!line.available && <p className="text-amber-800">No longer available, it will not be sent</p>}
                    </div>
                    <span
                      className={`shrink-0 tabular-nums ${line.available ? 'text-ink' : 'text-faint line-through'}`}
                    >
                      {formatMoney(line.subtotal_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {groups.length === 0 && <p className="text-sm text-muted">The order is empty now.</p>}
        </div>

        <div className="space-y-4 p-6 pt-4">
          <div className="flex items-center justify-between rounded-xl bg-canvas p-3">
            <span className="text-sm text-ink-soft">Total</span>
            <span className="text-lg font-semibold text-ink tabular-nums">{formatMoney(reviewed.total_cents)}</span>
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              icon={<PaperPlaneTiltIcon size={16} aria-hidden />}
              disabled={busy || !hasDishes}
              onClick={() => void handleConfirm()}
            >
              {busy ? 'Sending…' : 'Confirm and send'}
            </Button>
            <Button variant="ghost" size="md" disabled={busy} onClick={onClose}>
              Keep editing
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
