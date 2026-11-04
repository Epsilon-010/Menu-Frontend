import { CaretDownIcon, CaretUpIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { useId, useState, type FormEvent } from 'react'
import { Label } from '../../components/ui/label.tsx'
import { Switch } from '../../components/ui/switch.tsx'
import { Button, IconButton } from '../../shared/ui/Button.tsx'
import { Field, TextInput } from '../../shared/ui/Field.tsx'
import { ErrorText } from '../../shared/ui/Feedback.tsx'
import { CURRENCY_SYMBOL } from '../catalog/price.ts'
import type { ModifierGroup } from './api.ts'
import {
  blankOption,
  formFromGroup,
  groupPayload,
  MAX_NAME_LENGTH,
  MAX_OPTIONS,
  moveRow,
  parseLimits,
  selectionRule,
  type GroupForm,
  type GroupPayload,
  type OptionRow,
} from './logic.ts'

interface GroupEditorProps {
  initial?: ModifierGroup
  submitLabel: string
  /** Resolve to an error message, or null on success. */
  onSubmit: (payload: GroupPayload) => Promise<string | null>
  onCancel: () => void
}

/** Name, selection limits and the ordered options of one modifier group. */
export function GroupEditor({ initial, submitLabel, onSubmit, onCancel }: GroupEditorProps) {
  const [form, setForm] = useState<GroupForm>(() => formFromGroup(initial))
  const [busy, setBusy] = useState(false)
  const switchId = useId()
  const [error, setError] = useState<string | null>(null)

  function setOptions(update: (options: OptionRow[]) => OptionRow[]) {
    setForm((current) => ({ ...current, options: update(current.options) }))
  }

  function setOption(key: string, changes: Partial<OptionRow>) {
    setOptions((options) => options.map((option) => (option.key === key ? { ...option, ...changes } : option)))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = groupPayload(form)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setBusy(true)
    const failure = await onSubmit(result.payload)
    setBusy(false)
    setError(failure)
  }

  const limits = parseLimits(form)
  const { options } = form

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-canvas p-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_9rem_9rem]">
        <Field label="Nombre del grupo">
          <TextInput
            required
            maxLength={MAX_NAME_LENGTH}
            placeholder="Tamaño"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Elegir al menos" hint="Con 0 es opcional.">
          <TextInput
            required
            inputMode="numeric"
            value={form.min_select}
            onChange={(e) => setForm({ ...form, min_select: e.target.value })}
            className="font-mono"
          />
        </Field>
        <Field label="Elegir como máximo">
          <TextInput
            required
            inputMode="numeric"
            value={form.max_select}
            onChange={(e) => setForm({ ...form, max_select: e.target.value })}
            className="font-mono"
          />
        </Field>
      </div>
      {limits && (
        <p className="text-sm text-muted">
          Los comensales ven: <span className="font-medium text-ink">{selectionRule(limits.min, limits.max)}</span>
        </p>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink-soft">Opciones</legend>
        <ul className="space-y-2">
          {options.map((option, index) => (
            <li key={option.key} className="flex flex-wrap items-center gap-2">
              <TextInput
                aria-label={`Nombre de la opción ${index + 1}`}
                required
                maxLength={MAX_NAME_LENGTH}
                placeholder={index === 0 ? 'Chico' : 'Grande'}
                value={option.name}
                onChange={(e) => setOption(option.key, { name: e.target.value })}
                className="min-w-0 flex-1 basis-40"
              />
              <div className="relative w-32">
                <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-faint">
                  +{CURRENCY_SYMBOL}
                </span>
                <TextInput
                  aria-label={`Precio extra de la opción ${index + 1}`}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={option.price}
                  onChange={(e) => setOption(option.key, { price: e.target.value })}
                  className="pl-8 font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id={`${switchId}-${option.key}`}
                  aria-label={`Opción ${index + 1} disponible`}
                  checked={option.is_available}
                  onCheckedChange={(checked) => setOption(option.key, { is_available: checked })}
                />
                <Label htmlFor={`${switchId}-${option.key}`} className="font-normal">
                  Disponible
                </Label>
              </div>
              <div className="flex items-center gap-1">
                <IconButton
                  label={`Subir opción ${index + 1}`}
                  icon={<CaretUpIcon size={16} />}
                  disabled={busy || index === 0}
                  onClick={() => setOptions((rows) => moveRow(rows, index, -1))}
                />
                <IconButton
                  label={`Bajar opción ${index + 1}`}
                  icon={<CaretDownIcon size={16} />}
                  disabled={busy || index === options.length - 1}
                  onClick={() => setOptions((rows) => moveRow(rows, index, 1))}
                />
                <IconButton
                  label={`Quitar opción ${index + 1}`}
                  tone="danger"
                  icon={<TrashIcon size={16} />}
                  disabled={busy || options.length === 1}
                  onClick={() => setOptions((rows) => rows.filter((row) => row.key !== option.key))}
                />
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">
          Deja el precio vacío para una opción sin costo. Apaga Disponible cuando una opción esté agotada por ahora.
        </p>
        <Button
          variant="ghost"
          icon={<PlusIcon size={16} aria-hidden />}
          disabled={busy || options.length >= MAX_OPTIONS}
          onClick={() => setOptions((rows) => [...rows, blankOption()])}
        >
          Agregar opción
        </Button>
      </fieldset>

      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Guardando…' : submitLabel}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
