import { MoonIcon, SunIcon, WarningIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group.tsx'
import { MOTION } from '../../shared/ui/classes.ts'
import { TextInput } from '../../shared/ui/Field.tsx'
import { SliderField, SwitchField } from './Choice.tsx'
import type { ColorField, Theme, ThemeColors, ThemeMode } from './api.ts'
import { parseHexInput, withColor, withGradient, withMode } from './editor.ts'
import { contrastWarnings, MIN_CONTRAST } from './style.ts'

const COLOR_GROUPS: { title: string; fields: [ColorField, string][] }[] = [
  {
    title: 'Marca',
    fields: [
      ['primary', 'Primario'],
      ['secondary', 'Secundario'],
      ['accent', 'Acento'],
    ],
  },
  {
    title: 'Página y tarjetas',
    fields: [
      ['background', 'Fondo'],
      ['surface', 'Tarjetas'],
      ['border', 'Bordes'],
    ],
  },
  {
    title: 'Texto',
    fields: [
      ['text', 'Texto principal'],
      ['text_muted', 'Texto secundario'],
      ['price', 'Precios'],
    ],
  },
  {
    title: 'Botones',
    fields: [
      ['button_bg', 'Botón'],
      ['button_text', 'Texto del botón'],
      ['button_hover', 'Botón al pasar el cursor'],
    ],
  },
  {
    title: 'Etiquetas y barra del pedido',
    fields: [
      ['badge_bg', 'Etiqueta'],
      ['badge_text', 'Texto de la etiqueta'],
      ['cart_bg', 'Barra del pedido'],
      ['cart_text', 'Texto de la barra del pedido'],
    ],
  },
]

const LABELS: Record<ColorField, string> = Object.fromEntries(
  COLOR_GROUPS.flatMap((group) => group.fields),
) as Record<ColorField, string>

interface ColorInputProps {
  label: string
  value: string
  onChange: (value: string) => void
}

/** A color picker plus its hex code, which can also be typed (applied once it is a valid color). */
export function ColorInput({ label, value, onChange }: ColorInputProps) {
  const [typed, setTyped] = useState<string | null>(null)
  const invalid = typed !== null && parseHexInput(typed) === null
  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-ink-soft">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label}, selector de color`}
          value={value}
          onChange={(event) => {
            setTyped(null)
            onChange(event.target.value)
          }}
          className={`h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-line bg-surface p-1 ${MOTION}`}
        />
        <TextInput
          aria-label={`${label}, código hexadecimal`}
          aria-invalid={invalid}
          value={typed ?? value}
          maxLength={7}
          spellCheck={false}
          onChange={(event) => {
            setTyped(event.target.value)
            const parsed = parseHexInput(event.target.value)
            if (parsed !== null) onChange(parsed)
          }}
          onBlur={() => setTyped(null)}
          className={`font-mono uppercase ${invalid ? 'border-red-300' : ''}`}
        />
      </div>
    </div>
  )
}

interface ColorControlsProps {
  theme: Theme
  defaults: { light: ThemeColors; dark: ThemeColors }
  onChange: (theme: Theme) => void
}

export function ColorControls({ theme, defaults, onChange }: ColorControlsProps) {
  const { colors } = theme
  const warnings = contrastWarnings(colors)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <span className="block text-sm font-medium text-ink-soft">Modo</span>
        <ToggleGroup
          type="single"
          aria-label="Modo"
          value={colors.mode}
          onValueChange={(mode) => mode && mode !== colors.mode && onChange(withMode(theme, mode as ThemeMode, defaults))}
        >
          {(['light', 'dark'] as ThemeMode[]).map((mode) => (
            <ToggleGroupItem key={mode} value={mode}>
              {mode === 'light' ? <SunIcon size={16} aria-hidden /> : <MoonIcon size={16} aria-hidden />}
              {mode === 'light' ? 'Claro' : 'Oscuro'}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-xs text-muted">Al cambiar de modo se vuelve a la paleta de ese modo.</p>
      </div>

      {COLOR_GROUPS.map((group) => (
        <fieldset key={group.title} className="space-y-3">
          <legend className="text-sm font-semibold text-ink">{group.title}</legend>
          <div className="grid gap-4 @sm:grid-cols-2">
            {group.fields.map(([field, label]) => (
              <ColorInput
                key={field}
                label={label}
                value={colors[field]}
                onChange={(value) => onChange(withColor(theme, field, value))}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-ink">Degradado del encabezado</legend>
        <SwitchField
          label="Pintar el encabezado del menú con un degradado cuando no hay imagen de banner"
          checked={colors.gradient.enabled}
          onChange={(enabled) => onChange(withGradient(theme, { enabled }))}
        />
        {colors.gradient.enabled && (
          <div className="grid gap-4 @sm:grid-cols-2">
            <ColorInput label="Desde" value={colors.gradient.from} onChange={(from) => onChange(withGradient(theme, { from }))} />
            <ColorInput label="Hasta" value={colors.gradient.to} onChange={(to) => onChange(withGradient(theme, { to }))} />
            <SliderField
              label="Ángulo"
              value={colors.gradient.angle}
              min={0}
              max={360}
              step={15}
              display={`${colors.gradient.angle}°`}
              onChange={(angle) => onChange(withGradient(theme, { angle }))}
            />
          </div>
        )}
      </fieldset>

      {warnings.length > 0 && (
        <div role="status" className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-semibold">
            <WarningIcon size={16} aria-hidden />
            Algunos textos pueden ser difíciles de leer
          </p>
          <ul className="space-y-1">
            {warnings.map((warning) => (
              <li key={`${warning.foreground}-${warning.background}`}>
                {LABELS[warning.foreground]} sobre {LABELS[warning.background]}: contraste {warning.ratio.toFixed(2)}:1 (necesita{' '}
                {MIN_CONTRAST}:1 para WCAG AA)
              </li>
            ))}
          </ul>
          <p className="text-xs">Puedes guardar y publicar de todos modos; esto es solo un aviso.</p>
        </div>
      )}
    </div>
  )
}
