import { BellRingingIcon, ChairIcon, CheckIcon, DoorOpenIcon, MoneyIcon, XCircleIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { MOTION } from '../../shared/ui/classes.ts'
import { Badge, ErrorText } from '../../shared/ui/Feedback.tsx'
import { useRowAction } from '../../shared/ui/useRowAction.ts'
import { formatMoney } from '../catalog/price.ts'
import { OrderCard } from '../ordering/OrderCard.tsx'
import { clockTime } from '../ordering/logic.ts'
import { PAYMENT_METHODS, type NewOrderDish, type PaymentMethod, type TableOverview } from './api.ts'
import { AddDishControl, CancelDishControl } from './DishCorrections.tsx'
import { acceptsNewDishes, canCancelDish, hasSomethingToCharge, tableCardId } from './logic.ts'

type Mode = { kind: 'view' } | { kind: 'pay'; method: PaymentMethod } | { kind: 'confirm-close' }

interface TableBillCardProps {
  table: TableOverview
  /** Each action resolves to an error message, or null when it was done. */
  onOpen: () => Promise<string | null>
  onPay: (method: PaymentMethod) => Promise<string | null>
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
  const [mode, setMode] = useState<Mode>({ kind: 'view' })
  const { busy, error, run: runAction } = useRowAction()
  const { bill } = table
  const requestedAt = bill?.bill_requested_at ?? null

  function run(action: () => Promise<string | null>) {
    return runAction(action, () => setMode({ kind: 'view' }))
  }

  return (
    <section
      id={tableCardId(table.table_id)}
      tabIndex={-1}
      aria-busy={busy}
      className={`scroll-mt-24 space-y-4 rounded-2xl border bg-white p-4 focus:outline-none ${
        requestedAt ? 'border-amber-300 ring-2 ring-amber-200' : 'border-zinc-200'
      }`}
    >
      <header className="flex flex-wrap items-center gap-4">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${bill ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-500'}`}
        >
          <ChairIcon size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-zinc-950">{table.table_name}</h2>
            {bill ? <Badge tone="success">Open</Badge> : <Badge>Closed</Badge>}
            {requestedAt && <Badge tone="warning">Bill requested</Badge>}
          </div>
          <p className="text-sm text-zinc-500">
            {bill
              ? `Opened at ${clockTime(bill.opened_at)} · ${bill.orders.length} ${bill.orders.length === 1 ? 'order' : 'orders'}`
              : 'Guests cannot join with the QR until you open it.'}
          </p>
        </div>
        {bill && <p className="text-lg font-semibold text-zinc-950 tabular-nums">{formatMoney(bill.total_cents)}</p>}
      </header>

      {requestedAt && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl bg-amber-50 p-3">
          <p className="flex flex-1 items-center gap-2 text-sm text-amber-900">
            <BellRingingIcon size={16} aria-hidden />
            Asked for the bill at {clockTime(requestedAt)}.
          </p>
          <Button
            variant="secondary"
            icon={<CheckIcon size={16} aria-hidden />}
            disabled={busy}
            onClick={() => void run(onDismissRequest)}
          >
            Attended
          </Button>
        </div>
      )}

      {!bill && (
        <div className="space-y-2">
          <Button variant="primary" icon={<DoorOpenIcon size={16} aria-hidden />} disabled={busy} onClick={() => void run(onOpen)}>
            {busy ? 'Opening…' : 'Open table'}
          </Button>
          <p className="text-xs text-zinc-500">Once open, the table QR lets guests in until the bill is paid.</p>
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

      {bill && mode.kind === 'view' && (
        <div className="flex flex-wrap gap-2">
          {hasSomethingToCharge(bill) ? (
            <Button
              variant="primary"
              icon={<MoneyIcon size={16} aria-hidden />}
              disabled={busy}
              onClick={() => setMode({ kind: 'pay', method: 'cash' })}
            >
              Register payment
            </Button>
          ) : (
            <Button
              variant="secondary"
              icon={<XCircleIcon size={16} aria-hidden />}
              disabled={busy}
              onClick={() => setMode({ kind: 'confirm-close' })}
            >
              Close table
            </Button>
          )}
        </div>
      )}

      {bill && mode.kind === 'pay' && (
        <div className="space-y-4 rounded-xl bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            Charge <span className="font-semibold tabular-nums">{formatMoney(bill.total_cents)}</span> for{' '}
            {table.table_name}. Registering it closes the bill and signs every guest at the table out.
          </p>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-zinc-700">Payment method</legend>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((option) => {
                const selected = mode.method === option.value
                return (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-zinc-950 ${MOTION} ${
                      selected ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`method-${bill.id}`}
                      value={option.value}
                      checked={selected}
                      onChange={() => setMode({ kind: 'pay', method: option.value })}
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                )
              })}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" disabled={busy} onClick={() => void run(() => onPay(mode.method))}>
              {busy ? 'Registering…' : `Register ${formatMoney(bill.total_cents)} paid`}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setMode({ kind: 'view' })}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {bill && mode.kind === 'confirm-close' && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl bg-amber-50 p-4">
          <p className="flex-1 text-sm text-amber-900">
            Close {table.table_name}? Its QR stops letting guests in and anyone who joined is signed out.
          </p>
          <div className="flex gap-2">
            <Button variant="primary" disabled={busy} onClick={() => void run(onClose)}>
              {busy ? 'Closing…' : 'Close table'}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setMode({ kind: 'view' })}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && <ErrorText>{error}</ErrorText>}
    </section>
  )
}
