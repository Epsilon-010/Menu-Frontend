import { CreditCardIcon, MoneyIcon, WalletIcon } from '@phosphor-icons/react'
import { useId, useState, type ReactNode } from 'react'
import { Badge } from '../../components/ui/badge.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog.tsx'
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group.tsx'
import { Button } from '../../shared/ui/Button.tsx'
import { ErrorText } from '../../shared/ui/Feedback.tsx'
import { Field, TextInput } from '../../shared/ui/Field.tsx'
import { formatMoney } from '../catalog/price.ts'
import { PAYMENT_METHODS, type Bill, type PaymentMethod } from './api.ts'
import {
  changeDueCents,
  chargeLines,
  chargeScopeFor,
  chargeTotalCents,
  deliveredTotalCents,
  undeliveredDishes,
  type ChargeScope,
} from './logic.ts'

const METHOD_ICONS: Record<PaymentMethod, ReactNode> = {
  cash: <MoneyIcon size={18} aria-hidden />,
  card: <CreditCardIcon size={18} aria-hidden />,
  other: <WalletIcon size={18} aria-hidden />,
}

interface PayDialogProps {
  open: boolean
  tableName: string
  bill: Bill
  method: PaymentMethod
  onMethod: (method: PaymentMethod) => void
  busy: boolean
  error: string | null
  onClose: () => void
  /** `totalCents` is the amount on screen; `onlyDelivered` takes the dishes that never arrived off the bill. */
  onPay: (method: PaymentMethod, totalCents: number, onlyDelivered: boolean) => void
}

/**
 * The payment at the end of the visit: what is charged dish by dish, the total, the method and, for cash,
 * the change. If something never reached the table the waiter chooses to charge only what was delivered
 * (the default) or the whole bill.
 */
export function PayDialog({ open, tableName, bill, method, onMethod, busy, error, onClose, onPay }: PayDialogProps) {
  const [wanted, setWanted] = useState<ChargeScope>('delivered')
  const [received, setReceived] = useState('')
  const ids = useId()

  const pending = undeliveredDishes(bill)
  const delivered = deliveredTotalCents(bill)
  // Stays right if the bill changes while the dialog is open (a dish arrives, or the last pending one is cancelled).
  const scope = chargeScopeFor(bill, wanted)
  const total = chargeTotalCents(bill, scope)
  const lines = chargeLines(bill)
  const change = method === 'cash' ? changeDueCents(received, total) : null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cobrar {tableName}</DialogTitle>
          <DialogDescription>
            Al registrar el pago se cierra la cuenta y la sesión de los comensales de la mesa.
          </DialogDescription>
        </DialogHeader>

        <ul aria-label="Platillos de la cuenta" className="max-h-48 divide-y divide-line overflow-y-auto rounded-xl border border-line">
          {lines.map((line) => {
            const left = scope === 'delivered' && !line.delivered
            return (
              <li key={line.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className={`min-w-0 ${left ? 'text-faint line-through' : 'text-ink'}`}>
                  <span className="font-semibold tabular-nums">{line.quantity} ×</span> {line.name}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {!line.delivered && <Badge variant="warning">Sin entregar</Badge>}
                  <span className={`tabular-nums ${left ? 'text-faint line-through' : 'text-ink-soft'}`}>
                    {formatMoney(line.subtotal_cents)}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>

        {pending > 0 && (
          <div className="space-y-2">
            <span id={`${ids}-scope`} className="block text-sm font-medium text-ink-soft">
              {pending === 1 ? 'Hay 1 platillo sin entregar' : `Hay ${pending} platillos sin entregar`}
            </span>
            {delivered > 0 ? (
              <ToggleGroup
                type="single"
                width="full"
                value={scope}
                disabled={busy}
                aria-labelledby={`${ids}-scope`}
                // Pressing the chosen option again would clear it; a payment always covers one or the other.
                onValueChange={(next) => next && setWanted(next as ChargeScope)}
              >
                <ToggleGroupItem value="delivered" className="min-h-11">
                  Solo lo entregado
                </ToggleGroupItem>
                <ToggleGroupItem value="all" className="min-h-11">
                  Toda la cuenta
                </ToggleGroupItem>
              </ToggleGroup>
            ) : null}
            <p className="text-sm text-muted">
              {scope === 'delivered'
                ? 'Lo que no se entregó se quita de la cuenta y la cocina deja de verlo.'
                : delivered > 0
                  ? 'Se cobra también lo que no se ha entregado; la cocina deja de verlo al cerrar la cuenta.'
                  : 'Todavía no se entrega nada: se cobra toda la cuenta. Si la mesa ya no lo quiere, cancela los platillos y cierra la mesa.'}
            </p>
          </div>
        )}

        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm font-medium text-ink-soft">Total a cobrar</span>
          <span className="text-4xl font-semibold tracking-tight text-ink tabular-nums">{formatMoney(total)}</span>
        </div>

        <div className="space-y-2">
          <span id={`${ids}-method`} className="block text-sm font-medium text-ink-soft">
            Método de pago
          </span>
          <ToggleGroup
            type="single"
            width="full"
            value={method}
            disabled={busy}
            aria-labelledby={`${ids}-method`}
            // Pressing the chosen method again would clear it; a payment always has a method.
            onValueChange={(next) => next && onMethod(next as PaymentMethod)}
          >
            {PAYMENT_METHODS.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value} className="min-h-11 text-base">
                {METHOD_ICONS[option.value]}
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {method === 'cash' && (
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Recibido (opcional)" className="w-40">
              <TextInput
                inputMode="decimal"
                placeholder={formatMoney(total).slice(1)}
                value={received}
                disabled={busy}
                onChange={(event) => setReceived(event.target.value)}
              />
            </Field>
            {change !== null && (
              <p role="status" className={`pb-2 text-base font-semibold tabular-nums ${change < 0 ? 'text-danger' : 'text-ink'}`}>
                {change < 0 ? `Faltan ${formatMoney(-change)}` : `Cambio: ${formatMoney(change)}`}
              </p>
            )}
          </div>
        )}

        {error && <ErrorText>{error}</ErrorText>}
        <DialogFooter>
          <Button variant="ghost" size="md" className="min-h-11" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            className="min-h-11"
            disabled={busy}
            onClick={() => onPay(method, total, scope === 'delivered')}
          >
            {busy ? 'Registrando…' : `Registrar pago de ${formatMoney(total)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
