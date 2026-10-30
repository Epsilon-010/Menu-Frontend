import { PaperPlaneTiltIcon, PencilSimpleIcon, ShoppingBagIcon, TrashIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button, IconButton } from '../../shared/ui/Button.tsx'
import { Badge, EmptyState, ErrorText } from '../../shared/ui/Feedback.tsx'
import { useRowAction } from '../../shared/ui/useRowAction.ts'
import { formatMoney } from '../catalog/price.ts'
import type { Cart, CartLine, CartLineChanges, MenuCategory, MenuItem } from './api.ts'
import { LineOptionsForm } from './LineOptionsForm.tsx'
import { dishCount, groupByPerson } from './logic.ts'
import { modifierSummary } from './modifiers.ts'
import { QuantityStepper } from './QuantityStepper.tsx'

interface LineRowProps {
  line: CartLine
  /** The line's item on the menu now; editing the options needs it. */
  item: MenuItem | undefined
  onChange: (changes: CartLineChanges) => Promise<string | null>
  onRemove: () => Promise<string | null>
}

function LineRow({ line, item, onChange, onRemove }: LineRowProps) {
  const { busy, error, run } = useRowAction()
  const [editing, setEditing] = useState(false)
  const options = modifierSummary(line.modifiers)
  // Only an item still on the menu, and with options, can have its options changed.
  const editable = item !== undefined && item.modifier_groups.length > 0
  return (
    <li className="space-y-2 py-3" aria-busy={busy}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className={`font-medium text-pretty ${line.available ? 'text-ink' : 'text-faint'}`}>{line.name}</p>
          {options && <p className="text-sm text-muted">{options}</p>}
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
        <div className="flex items-center gap-1">
          {editable && !editing && (
            <Button
              variant="ghost"
              icon={<PencilSimpleIcon size={16} aria-hidden />}
              disabled={busy}
              onClick={() => setEditing(true)}
              className="type-button"
            >
              Edit options
            </Button>
          )}
          <IconButton
            label={`Remove ${line.name}`}
            tone="danger"
            icon={<TrashIcon size={16} />}
            disabled={busy}
            onClick={() => void run(onRemove)}
          />
        </div>
      </div>
      {editable && editing && (
        <LineOptionsForm
          item={item}
          line={line}
          onSave={(optionIds) => onChange({ modifier_option_ids: optionIds })}
          onClose={() => setEditing(false)}
        />
      )}
      {error && <ErrorText>{error}</ErrorText>}
    </li>
  )
}

interface CartContentsProps {
  cart: Cart
  /** The menu, to reopen the options of a line; a line whose item is not in it cannot be edited. */
  menu?: MenuCategory[]
  onChange: (lineId: string, changes: CartLineChanges) => Promise<string | null>
  onRemove: (lineId: string) => Promise<string | null>
  onSend: () => void
}

/** The shared cart: every line with who added it, the total from the server and the send button. */
export function CartContents({ cart, menu = [], onChange, onRemove, onSend }: CartContentsProps) {
  if (cart.lines.length === 0) {
    return (
      <EmptyState icon={<ShoppingBagIcon size={24} aria-hidden />} title="Nothing in the order yet">
        Everyone at the table adds to the same order. Tap Add on a dish to start.
      </EmptyState>
    )
  }

  const count = dishCount(cart)
  const items = new Map(menu.flatMap((category) => category.items.map((item) => [item.id, item] as const)))
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
                item={items.get(line.item_id)}
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
        className="type-button-face w-full"
        icon={<PaperPlaneTiltIcon size={16} aria-hidden />}
        disabled={count === 0}
        onClick={onSend}
      >
        Send order
      </Button>
    </div>
  )
}
