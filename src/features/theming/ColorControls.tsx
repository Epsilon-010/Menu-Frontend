import { WarningIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { MOTION } from '../../shared/ui/classes.ts'
import { Field, TextInput } from '../../shared/ui/Field.tsx'
import type { ColorField, Theme, ThemeColors, ThemeMode } from './api.ts'
import { parseHexInput, withColor, withGradient, withMode } from './editor.ts'
import { contrastWarnings, MIN_CONTRAST } from './style.ts'

const COLOR_GROUPS: { title: string; fields: [ColorField, string][] }[] = [
  {
    title: 'Brand',
    fields: [
      ['primary', 'Primary'],
      ['secondary', 'Secondary'],
      ['accent', 'Accent'],
    ],
  },
  {
    title: 'Page and cards',
    fields: [
      ['background', 'Background'],
      ['surface', 'Cards'],
      ['border', 'Borders'],
    ],
  },
  {
    title: 'Text',
    fields: [
      ['text', 'Main text'],
      ['text_muted', 'Secondary text'],
      ['price', 'Prices'],
    ],
  },
  {
    title: 'Buttons',
    fields: [
      ['button_bg', 'Button'],
      ['button_text', 'Button text'],
      ['button_hover', 'Button hover'],
    ],
  },
  {
    title: 'Badges and order bar',
    fields: [
      ['badge_bg', 'Badge'],
      ['badge_text', 'Badge text'],
      ['cart_bg', 'Order bar'],
      ['cart_text', 'Order bar text'],
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
          aria-label={`${label} color`}
          value={value}
          onChange={(event) => {
            setTyped(null)
            onChange(event.target.value)
          }}
          className={`h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-line bg-surface p-1 ${MOTION}`}
        />
        <TextInput
          aria-label={`${label} hex code`}
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
        <span className="block text-sm font-medium text-ink-soft">Mode</span>
        <div role="radiogroup" aria-label="Mode" className="inline-flex gap-1 rounded-xl border border-line bg-surface p-1">
          {(['light', 'dark'] as ThemeMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={colors.mode === mode}
              onClick={() => colors.mode !== mode && onChange(withMode(theme, mode, defaults))}
              className={`rounded-lg px-3 py-2 text-sm font-semibold active:scale-[0.98] ${MOTION} ${
                colors.mode === mode ? 'bg-action text-action-ink' : 'text-ink-soft hover:bg-subtle'
              }`}
            >
              {mode === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">Changing the mode starts again from that mode's palette.</p>
      </div>

      {COLOR_GROUPS.map((group) => (
        <fieldset key={group.title} className="space-y-3">
          <legend className="text-sm font-semibold text-ink">{group.title}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
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
        <legend className="text-sm font-semibold text-ink">Header gradient</legend>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={colors.gradient.enabled}
            onChange={(event) => onChange(withGradient(theme, { enabled: event.target.checked }))}
            className="h-4 w-4 accent-zinc-950"
          />
          Paint the menu header with a gradient when there is no banner image
        </label>
        {colors.gradient.enabled && (
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorInput label="From" value={colors.gradient.from} onChange={(from) => onChange(withGradient(theme, { from }))} />
            <ColorInput label="To" value={colors.gradient.to} onChange={(to) => onChange(withGradient(theme, { to }))} />
            <Field label={`Angle: ${colors.gradient.angle}°`}>
              <input
                type="range"
                min={0}
                max={360}
                step={15}
                value={colors.gradient.angle}
                onChange={(event) => onChange(withGradient(theme, { angle: Number(event.target.value) }))}
                className="w-full accent-zinc-950"
              />
            </Field>
          </div>
        )}
      </fieldset>

      {warnings.length > 0 && (
        <div role="status" className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-semibold">
            <WarningIcon size={16} aria-hidden />
            Some text may be hard to read
          </p>
          <ul className="space-y-1">
            {warnings.map((warning) => (
              <li key={`${warning.foreground}-${warning.background}`}>
                {LABELS[warning.foreground]} on {LABELS[warning.background]}: contrast {warning.ratio.toFixed(2)}:1 (needs{' '}
                {MIN_CONTRAST}:1 for WCAG AA)
              </li>
            ))}
          </ul>
          <p className="text-xs">You can still save and publish; this is only a warning.</p>
        </div>
      )}
    </div>
  )
}
