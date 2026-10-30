import { useId } from 'react'
import { MOTION } from '../../shared/ui/classes.ts'
import { formatMoney } from '../catalog/price.ts'
import type { ModifierGroup } from './api.ts'
import { groupHint, isBlocked, isSingleChoice, toggleOption } from './modifiers.ts'

interface ModifierPickerProps {
  groups: ModifierGroup[]
  selected: string[]
  onChange: (selected: string[]) => void
  disabled?: boolean
}

/**
 * The options of an item, one group after another: radios when the group takes one option,
 * checkboxes otherwise. Sold out options show but cannot be picked; a full group blocks the rest.
 * Only theme tokens: the table menu dresses it in the business colours.
 */
export function ModifierPicker({ groups, selected, onChange, disabled = false }: ModifierPickerProps) {
  const id = useId()
  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const single = isSingleChoice(group)
        return (
          <fieldset key={group.id} className="space-y-2" disabled={disabled}>
            <legend className="flex w-full items-baseline justify-between gap-4">
              <span className="text-sm font-semibold text-ink">{group.name}</span>
              <span className="text-xs text-muted">{groupHint(group)}</span>
            </legend>
            <ul className="space-y-1">
              {group.options.map((option) => {
                const checked = option.available && selected.includes(option.id)
                const blocked = isBlocked(group, selected, option)
                return (
                  <li key={option.id}>
                    <label
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${MOTION} ${
                        checked ? 'border-action bg-surface' : 'border-line bg-surface'
                      } ${blocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-subtle'}`}
                    >
                      <input
                        type={single ? 'radio' : 'checkbox'}
                        name={`${id}-${group.id}`}
                        value={option.id}
                        className="h-4 w-4 accent-action"
                        checked={checked}
                        disabled={blocked}
                        onChange={() => onChange(toggleOption(groups, selected, option.id))}
                        // A checked radio fires no change when tapped again: an optional one lets go here.
                        onClick={single && checked ? () => onChange(toggleOption(groups, selected, option.id)) : undefined}
                      />
                      <span className={`flex-1 ${option.available ? 'text-ink' : 'text-faint line-through'}`}>{option.name}</span>
                      {!option.available ? (
                        <span className="text-xs font-medium text-muted">Sold out</span>
                      ) : (
                        option.price_cents > 0 && (
                          <span className="text-price tabular-nums">+{formatMoney(option.price_cents)}</span>
                        )
                      )}
                    </label>
                  </li>
                )
              })}
            </ul>
          </fieldset>
        )
      })}
    </div>
  )
}
