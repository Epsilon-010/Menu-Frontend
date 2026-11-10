import { useId, type ReactNode } from 'react'
import { Label } from '../../components/ui/label.tsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select.tsx'
import { Slider } from '../../components/ui/slider.tsx'
import { Switch } from '../../components/ui/switch.tsx'
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group.tsx'
import { cn } from '../../lib/utils.ts'

interface ControlIds {
  /** The id of the focusable control, for <label for>. */
  controlId: string
  /** The id of the visible label, for aria-labelledby on controls a <label> cannot name. */
  labelId: string
  hintId: string | undefined
}

interface ControlFieldProps {
  label: string
  hint?: string
  /** Whether the label points at the control with `for` (buttons and inputs) or only names it by id. */
  labelFor?: boolean
  className?: string
  children: (ids: ControlIds) => ReactNode
}

/** A visible label, its control and an optional hint, wired together by ids. */
export function ControlField({ label, hint, labelFor = true, className, children }: ControlFieldProps) {
  const id = useId()
  const ids: ControlIds = { controlId: `${id}-control`, labelId: `${id}-label`, hintId: hint ? `${id}-hint` : undefined }
  return (
    <div className={cn('space-y-2', className)}>
      <Label id={ids.labelId} htmlFor={labelFor ? ids.controlId : undefined}>
        {label}
      </Label>
      {children(ids)}
      {hint && (
        <p id={ids.hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}

// A segmented control only fits a few short options side by side in half of the options panel (about 165 px):
// each option takes roughly 7.5 px per character of a 14 px label plus 20 px of padding. Measured in the editor:
// "Izquierda / Derecha" fits; "Cuadrada / 4:3 / 16:9" and "Compacto / Cómodo / Amplio" do not.
const SEGMENTED_MAX_OPTIONS = 4
const SEGMENTED_WIDTH_PX = 165
const CHARACTER_PX = 7.5
const OPTION_PADDING_PX = 20

function fitsSegmented(labels: string[]): boolean {
  const width = labels.reduce((total, label) => total + label.length * CHARACTER_PX + OPTION_PADDING_PX, 0)
  return labels.length <= SEGMENTED_MAX_OPTIONS && width <= SEGMENTED_WIDTH_PX
}

interface ChoiceProps<T extends string> {
  label: string
  value: T
  options: readonly T[]
  labels: Record<T, string>
  onChange: (value: T) => void
  hint?: string
  disabled?: boolean
  /** Options shown but not selectable. */
  disabledOptions?: readonly T[]
  /** `auto` picks a segmented control for a few short options and a select list otherwise. */
  kind?: 'auto' | 'select' | 'segmented'
}

/** A choice over a fixed list of theme options, each shown by its label. */
export function Choice<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
  hint,
  disabled = false,
  disabledOptions = [],
  kind = 'auto',
}: ChoiceProps<T>) {
  const segmented = kind === 'segmented' || (kind === 'auto' && fitsSegmented(options.map((option) => labels[option])))

  if (segmented) {
    return (
      <ControlField label={label} hint={hint} labelFor={false}>
        {({ labelId, hintId }) => (
          <ToggleGroup
            type="single"
            width="full"
            value={value}
            disabled={disabled}
            aria-labelledby={labelId}
            aria-describedby={hintId}
            // Pressing the chosen option again would clear it; a theme option always has a value.
            onValueChange={(next) => next && onChange(next as T)}
          >
            {options.map((option) => (
              <ToggleGroupItem key={option} value={option} disabled={disabledOptions.includes(option)}>
                {labels[option]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </ControlField>
    )
  }

  return (
    <ControlField label={label} hint={hint}>
      {({ controlId, hintId }) => (
        <Select value={value} disabled={disabled} onValueChange={(next) => onChange(next as T)}>
          <SelectTrigger id={controlId} aria-describedby={hintId}>
            {/* The chosen label is given explicitly so it also shows before the list ever opens. */}
            <SelectValue>{labels[value]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option} disabled={disabledOptions.includes(option)}>
                {labels[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </ControlField>
  )
}

interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  /** The value as the admin reads it (with its unit); shown in the label. */
  display: string
  onChange: (value: number) => void
}

/** A slider over a numeric theme setting, its current value in the label. */
export function SliderField({ label, value, min, max, step = 1, display, onChange }: SliderFieldProps) {
  return (
    <ControlField label={`${label}: ${display}`} labelFor={false}>
      {({ labelId }) => (
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={([next]) => onChange(next)}
          thumbProps={{ 'aria-labelledby': labelId, 'aria-valuetext': display }}
        />
      )}
    </ControlField>
  )
}

interface SwitchFieldProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/** An on/off theme setting. */
export function SwitchField({ label, checked, onChange }: SwitchFieldProps) {
  const id = useId()
  return (
    <div className="flex items-start gap-3">
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5" />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  )
}
