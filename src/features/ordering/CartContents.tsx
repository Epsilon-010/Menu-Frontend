import { PaperPlaneTiltIcon, ShoppingBagIcon, TrashIcon } from '@phosphor-icons/react'
import { Button, IconButton } from '../../shared/ui/Button.tsx'
import { Badge, EmptyState, ErrorText } from '../../shared/ui/Feedback.tsx'
import { useRowAction } from '../../shared/ui/useRowAction.ts'
import { formatMoney } from '../catalog/price.ts'
import type { Cart, CartLine, CartLineChanges } from './api.ts'
import { dishCount, groupByPerson } from './logic.ts'
import { QuantityStepper } from './MenuBrowser.tsx'

interface LineRowProps {
  line: CartLine
  onChange: (changes: CartLineChanges) => Promise<string | null>
  onRemove: () => Promise<string | null>
}

function LineRow({ line, onChange, onRemove }: LineRowProps) {
  const { busy, error, run } = useRowAction()
  return (
    <li className="space-y-2 py-3" aria-busy={busy}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className={`font-medium text-pretty ${line.available ? 'text-ink' : 'text-faint'}`}>{line.name}</p>
          {line.note && <p className="text-sm text-muted">{line.note}</p>}
          {!line.available && <Badge tone="warning">No longer available</Badge>}
        </div>
        <p
          className={`shrink-0 text-sm font-semibold tabular-nums ${line.available ? 'text-ink' : 'text-faint line-through'}`}
        >
          {formatMoney(line.subtotal_cents)}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <QuantityStepper
          value={line.quantity}
          label={line.name}
          disabled={busy || !line.available}
          onChange={(quantity) => void run(() => onChange({ quantity }))}
        />
        <IconButton
          label={`Remove ${line.name}`}
          tone="danger"
          icon={<TrashIcon size={16} />}
          disabled={busy}
          onClick={() => void run(onRemove)}
        />
      </div>
      {error && <ErrorText>{error}</ErrorText>}
    </li>
  )
}

interface CartContentsProps {
  cart: Cart
  onChange: (lineId: string, changes: CartLineChanges) => Promise<string | null>
  onRemove: (lineId: string) => Promise<string | null>
  onSend: () => void
}

/** The shared cart: every line with who added it, the total from the server and the send button. */
export function CartContents({ cart, onChange, onRemove, onSend }: CartContentsProps) {
  if (cart.lines.length === 0) {
    return (
      <EmptyState icon={<ShoppingBagIcon size={24} aria-hidden />} title="Nothing in the order yet">
        Everyone at the table adds to the same order. Tap Add on a dish to start.
      </EmptyState>
    )
  }

  const count = dishCount(cart)
  return (
    <div className="space-y-4">
      {groupByPerson(cart.lines).map((group) => (
        <section key={group.person} aria-label={`Added by ${group.person}`}>
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{group.person}</h3>
          <ul className="divide-y divide-subtle">
            {group.lines.map((line) => (
              <LineRow
                key={line.id}
                line={line}
                onChange={(changes) => onChange(line.id, changes)}
                onRemove={() => onRemove(line.id)}
              />
            ))}
          </ul>
        </section>
      ))}

      <div className="flex items-center justify-between border-t border-line pt-4">
        <span className="text-sm text-muted">
          Total · {count} {count === 1 ? 'dish' : 'dishes'}
        </span>
        <span className="text-lg font-semibold text-ink tabular-nums">{formatMoney(cart.total_cents)}</span>
      </div>
      <Button
        variant="primary"
        size="md"
        className="w-full"
        icon={<PaperPlaneTiltIcon size={16} aria-hidden />}
        disabled={count === 0}
        onClick={onSend}
      >
        Send order
      </Button>
    </div>
  )
}
