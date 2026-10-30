import { MinusIcon, PlusIcon } from '@phosphor-icons/react'
import { IconButton } from '../../shared/ui/Button.tsx'
import { MAX_QUANTITY, MIN_QUANTITY } from './api.ts'

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  /** What is being counted, for screen readers ("Tacos al pastor"). */
  label: string
}

export function QuantityStepper({ value, onChange, disabled = false, label }: QuantityStepperProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface p-1">
      <IconButton
        label={`One less ${label}`}
        icon={<MinusIcon size={16} />}
        disabled={disabled || value <= MIN_QUANTITY}
        onClick={() => onChange(value - 1)}
        className="p-1"
      />
      <span aria-live="polite" className="min-w-8 text-center text-sm font-semibold text-ink tabular-nums">
        {value}
      </span>
      <IconButton
        label={`One more ${label}`}
        icon={<PlusIcon size={16} />}
        disabled={disabled || value >= MAX_QUANTITY}
        onClick={() => onChange(value + 1)}
        className="p-1"
      />
    </div>
  )
}
