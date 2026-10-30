import { Field, Select } from '../../shared/ui/Field.tsx'

interface ChoiceProps<T extends string> {
  label: string
  value: T
  options: T[]
  labels: Record<T, string>
  onChange: (value: T) => void
  hint?: string
  disabled?: boolean
}

/** A select over a fixed list of theme options, each shown by its label. */
export function Choice<T extends string>({ label, value, options, labels, onChange, hint, disabled = false }: ChoiceProps<T>) {
  return (
    <Field label={label} hint={hint}>
      <Select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </Select>
    </Field>
  )
}
