import {
  BellRingingIcon,
  ChairIcon,
  CheckIcon,
  CircleIcon,
  CreditCardIcon,
  DoorOpenIcon,
  MoneyIcon,
  WalletIcon,
  WarningIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import { useReducer, type ReactNode } from 'react'
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
import { cn } from '../../lib/utils.ts'
import { Button } from '../../shared/ui/Button.tsx'
import { ErrorText } from '../../shared/ui/Feedback.tsx'
import { useRowAction } from '../../shared/ui/useRowAction.ts'
import { formatMoney } from '../catalog/price.ts'
import { OrderCard } from '../ordering/OrderCard.tsx'
import { clockTime } from '../ordering/logic.ts'
import { PAYMENT_METHODS, type NewOrderDish, type PaymentMethod, type TableOverview } from './api.ts'
import { billDialogFor, billDialogReducer, NO_BILL_DIALOG } from './billDialog.ts'
import { AddDishControl, CancelDishControl } from './DishCorrections.tsx'
import { acceptsNewDishes, canCancelDish, hasSomethingToCharge, tableCardId, undeliveredDishes } from './logic.ts'

const METHOD_ICONS: Record<PaymentMethod, ReactNode> = {
  cash: <MoneyIcon size={18} aria-hidden />,
  card: <CreditCardIcon size={18} aria-hidden />,
  other: <WalletIcon size={18} aria-hidden />,
}

interface TableBillCardProps {
  table: TableOverview
  /** Each action resolves to an error message, or null when it was done. */
  onOpen: () => Promise<string | null>
  /** `expectedTotalCents` is the total on screen when the waiter confirmed. */
  onPay: (method: PaymentMethod, expectedTotalCents: number) => Promise<string | null>
  onClose: () => Promise<string | null>
  /** The waiter attended the table that asked for the bill. */
  onDismissRequest: () => Promise<string | null>
  /** Corrections while the bill is open: each resolves to an error message, or null when done. */
  onCancelDish: (orderId: string, itemId: string, reason: string) => Promise<string | null>
  onAddDish: (orderId: string, dish: NewOrderDish) => Promise<string | null>
}

/** One table for the waiter: open it, follow its orders and register the payment. */
export function TableBillCard({
  table,
  onOpen,
  onPay,
  onClose,
  onDismissRequest,
  onCancelDish,
  onAddDish,
}: TableBillCardProps) {
  const [dialog, dispatch] = useReducer(billDialogReducer, NO_BILL_DIALOG)
  const { busy, run: runAction } = useRowAction()
  const { bill } = table
  const billId = bill?.id ?? null
  const requestedAt = bill?.bill_requested_at ?? null
  const { mode, error } = billDialogFor(dialog, billId)
  const pending = bill ? undeliveredDishes(bill) : 0

  async function run(action: () => Promise<string | null>) {
    const failure = await runAction(action)
    dispatch({ type: 'settled', billId, error: failure })
  }

  /** Closing a confirmation while it is being saved would hide its outcome. */
  function closeDialog() {
    if (!busy) dispatch({ type: 'dismiss' })
  }

  return (
    <section
      id={tableCardId(table.table_id)}
      tabIndex={-1}
      aria-busy={busy}
      className={cn(
        'scroll-mt-24 space-y-4 rounded-2xl border bg-surface p-4 shadow-xs focus:outline-none',
        bill && 'sm:p-6',
        requestedAt ? 'border-amber-300 ring-2 ring-amber-200' : 'border-line',
      )}
    >
      <header className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-lg',
            bill ? 'bg-action text-action-ink' : 'bg-subtle text-muted',
          )}
        >
          <ChairIcon size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-ink">{table.table_name}</h2>
            {bill ? (
              <Badge variant="success">
                <CircleIcon size={8} weight="fill" aria-hidden />
                Abierta
              </Badge>
            ) : (
              <Badge variant="outline">Cerrada</Badge>
            )}
            {requestedAt && (
              <Badge variant="warning">
                <BellRingingIcon size={14} aria-hidden />
                Pidió la cuenta
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted">
            {bill
              ? `Abierta a las ${clockTime(bill.opened_at)} · ${bill.orders.length} ${bill.orders.length === 1 ? 'orden' : 'órdenes'}`
              : 'Sin visita'}
          </p>
        </div>
        {!bill && (
          <Button
            variant="secondary"
            className="min-h-11"
            icon={<DoorOpenIcon size={18} aria-hidden />}
            disabled={busy}
            onClick={() => void run(onOpen)}
          >
            {busy ? 'Abriendo…' : 'Abrir'}
          </Button>
        )}
        {bill && (
          <div className="text-right">
            <p className="text-2xl font-semibold tracking-tight text-ink tabular-nums">{formatMoney(bill.total_cents)}</p>
            {pending > 0 && (
              <p className="text-sm text-muted">{pending === 1 ? '1 platillo sin entregar' : `${pending} platillos sin entregar`}</p>
            )}
          </div>
        )}
      </header>

      {requestedAt && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="flex flex-1 items-center gap-2 text-sm font-medium text-amber-900">
            <BellRingingIcon size={18} aria-hidden />
            Pidió la cuenta a las {clockTime(requestedAt)}.
          </p>
          <Button
            variant="secondary"
            className="min-h-11"
            icon={<CheckIcon size={16} aria-hidden />}
            disabled={busy}
            onClick={() => void run(onDismissRequest)}
          >
            Atendida
          </Button>
        </div>
      )}

      {bill && bill.orders.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {bill.orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              itemActions={(item) =>
                canCancelDish(bill, item) && (
                  <CancelDishControl onCancel={(reason) => onCancelDish(order.id, item.id, reason)} />
                )
              }
              footer={acceptsNewDishes(bill) && <AddDishControl onAdd={(dish) => onAddDish(order.id, dish)} />}
            />
          ))}
        </div>
      )}

      {bill && (
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          {hasSomethingToCharge(bill) ? (
            <Button
              variant="primary"
              size="md"
              className="min-h-12 w-full sm:w-auto"
              icon={<MoneyIcon size={20} aria-hidden />}
              disabled={busy}
              onClick={() => dispatch({ type: 'open', billId: bill.id, mode: { kind: 'pay', method: 'cash' } })}
            >
              Registrar pago
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="md"
              className="min-h-12 w-full sm:w-auto"
              icon={<XCircleIcon size={20} aria-hidden />}
              disabled={busy}
              onClick={() => dispatch({ type: 'open', billId: bill.id, mode: { kind: 'confirm-close' } })}
            >
              Cerrar mesa
            </Button>
          )}
        </div>
      )}

      {bill && (
        <Dialog open={mode.kind === 'pay'} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cobrar {table.table_name}</DialogTitle>
              <DialogDescription>
                Al registrar el pago se cierra la cuenta y se cierra la sesión de todos los comensales de la mesa.
              </DialogDescription>
            </DialogHeader>
            <p className="text-4xl font-semibold tracking-tight text-ink tabular-nums">{formatMoney(bill.total_cents)}</p>
            {pending > 0 && (
              <p role="alert" className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <WarningIcon size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  <span className="font-semibold">
                    {pending === 1 ? 'Falta 1 platillo por entregar.' : `Faltan ${pending} platillos por entregar.`}
                  </span>{' '}
                  El total ya los incluye. Si cobras ahora, la cocina deja de verlos y ya no se podrán entregar ni cancelar.
                </span>
              </p>
            )}
            <div className="space-y-2">
              <span id={`method-${bill.id}`} className="block text-sm font-medium text-ink-soft">
                Método de pago
              </span>
              <ToggleGroup
                type="single"
                width="full"
                value={mode.kind === 'pay' ? mode.method : undefined}
                disabled={busy}
                aria-labelledby={`method-${bill.id}`}
                // Pressing the chosen method again would clear it; a payment always has a method.
                onValueChange={(next) => next && dispatch({ type: 'method', method: next as PaymentMethod })}
              >
                {PAYMENT_METHODS.map((option) => (
                  <ToggleGroupItem key={option.value} value={option.value} className="min-h-11 text-base">
                    {METHOD_ICONS[option.value]}
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            {error && <ErrorText>{error}</ErrorText>}
            <DialogFooter>
              <Button variant="ghost" size="md" className="min-h-11" disabled={busy} onClick={closeDialog}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="md"
                className="min-h-11"
                disabled={busy}
                onClick={() => {
                  if (mode.kind === 'pay') void run(() => onPay(mode.method, bill.total_cents))
                }}
              >
                {busy
                  ? 'Registrando…'
                  : pending > 0
                    ? `Cobrar ${formatMoney(bill.total_cents)} de todos modos`
                    : `Registrar pago de ${formatMoney(bill.total_cents)}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {bill && (
        <Dialog open={mode.kind === 'confirm-close'} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Cerrar {table.table_name}?</DialogTitle>
              <DialogDescription>
                Se cierra la sesión de quien haya entrado; el próximo que escanee el QR abre una visita nueva.
              </DialogDescription>
            </DialogHeader>
            {error && <ErrorText>{error}</ErrorText>}
            <DialogFooter>
              <Button variant="ghost" size="md" className="min-h-11" disabled={busy} onClick={closeDialog}>
                Cancelar
              </Button>
              <Button variant="primary" size="md" className="min-h-11" disabled={busy} onClick={() => void run(onClose)}>
                {busy ? 'Cerrando…' : 'Cerrar mesa'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {mode.kind === 'view' && error && <ErrorText>{error}</ErrorText>}
    </section>
  )
}
