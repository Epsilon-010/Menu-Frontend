import { Field, Select } from '../../shared/ui/Field.tsx'
import type { FontId, FontRole, FontStyle, TextAlign, TextElement, TextTransform, Theme } from './api.ts'
import { withRoleFont, withScale, withTextStyle } from './editor.ts'
import {
  FONT_ROLES,
  FONTS,
  LETTER_SPACING_RANGE,
  LINE_HEIGHT_RANGE,
  SCALE_RANGE,
  SIZE_RANGE,
  TEXT_ELEMENTS,
} from './typography.ts'

const ROLE_LABELS: Record<FontRole, string> = { heading: 'Headings', body: 'Body', price: 'Prices', button: 'Buttons' }
const ELEMENT_LABELS: Record<TextElement, string> = {
  business_name: 'Business name',
  category: 'Category heading',
  product_name: 'Product name',
  description: 'Description',
  price: 'Price',
  button: 'Buttons',
}
const FONT_GROUPS: { label: string; fonts: FontId[] }[] = [
  { label: 'Sans serif', fonts: ['geist', 'inter', 'poppins', 'montserrat', 'lato', 'nunito'] },
  { label: 'Serif', fonts: ['playfair_display', 'lora', 'merriweather'] },
  { label: 'Display', fonts: ['oswald', 'bebas_neue'] },
  { label: 'Handwritten', fonts: ['pacifico', 'caveat'] },
]
const TRANSFORM_LABELS: Record<TextTransform, string> = {
  none: 'As written',
  uppercase: 'UPPERCASE',
  lowercase: 'lowercase',
  capitalize: 'Capitalize Each Word',
}
const ALIGN_LABELS: Record<TextAlign, string> = { left: 'Left', center: 'Center', right: 'Right' }
// Price and buttons sit in a row, where alignment has no visible effect.
const ALIGNABLE: TextElement[] = ['business_name', 'category', 'product_name', 'description']

function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  display,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  display: string
  onChange: (value: number) => void
}) {
  return (
    <Field label={`${label}: ${display}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-zinc-950"
      />
    </Field>
  )
}

function FontSelect({ value, onChange }: { value: FontId; onChange: (font: FontId) => void }) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value as FontId)}>
      {FONT_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.fonts.map((font) => (
            <option key={font} value={font}>
              {FONTS[font].family}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  )
}

function ElementControls({ theme, element, onChange }: { theme: Theme; element: TextElement; onChange: (theme: Theme) => void }) {
  const style = theme.typography.elements[element]
  const font = FONTS[theme.typography.fonts[style.font]]
  const change = (changes: Parameters<typeof withTextStyle>[2]) => onChange(withTextStyle(theme, element, changes))

  return (
    <details className="group rounded-lg border border-line bg-surface">
      <summary className="flex cursor-pointer items-center justify-between gap-4 px-3 py-2 text-sm font-semibold text-ink">
        {ELEMENT_LABELS[element]}
        <span className="text-xs font-normal text-muted">
          {font.family} · {style.size}px · {style.weight}
        </span>
      </summary>
      <div className="grid gap-4 border-t border-line p-3 sm:grid-cols-2">
        <Field label="Font">
          <Select value={style.font} onChange={(event) => change({ font: event.target.value as FontRole })}>
            {FONT_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]} ({FONTS[theme.typography.fonts[role]].family})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Weight">
          <Select value={style.weight} onChange={(event) => change({ weight: Number(event.target.value) })}>
            {font.weights.map((weight) => (
              <option key={weight} value={weight}>
                {weight}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Style" hint={font.italic ? undefined : `${font.family} has no italics.`}>
          <Select
            value={style.style}
            disabled={!font.italic}
            onChange={(event) => change({ style: event.target.value as FontStyle })}
          >
            <option value="normal">Normal</option>
            <option value="italic">Italic</option>
          </Select>
        </Field>
        <Field label="Letter case">
          <Select value={style.transform} onChange={(event) => change({ transform: event.target.value as TextTransform })}>
            {Object.entries(TRANSFORM_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        {ALIGNABLE.includes(element) && (
          <Field label="Alignment">
            <Select value={style.align} onChange={(event) => change({ align: event.target.value as TextAlign })}>
              {Object.entries(ALIGN_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <RangeField
          label="Size"
          value={style.size}
          min={SIZE_RANGE.min}
          max={SIZE_RANGE.max}
          display={`${style.size}px`}
          onChange={(size) => change({ size })}
        />
        <RangeField
          label="Line height"
          value={style.line_height}
          min={LINE_HEIGHT_RANGE.min}
          max={LINE_HEIGHT_RANGE.max}
          display={(style.line_height / 100).toFixed(2)}
          onChange={(line_height) => change({ line_height })}
        />
        <RangeField
          label="Letter spacing"
          value={style.letter_spacing}
          min={LETTER_SPACING_RANGE.min}
          max={LETTER_SPACING_RANGE.max}
          step={5}
          display={`${(style.letter_spacing / 1000).toFixed(3)}em`}
          onChange={(letter_spacing) => change({ letter_spacing })}
        />
      </div>
    </details>
  )
}

interface TypographyControlsProps {
  theme: Theme
  onChange: (theme: Theme) => void
}

/** Fonts of the four roles, the global scale and the settings of each text of the menu. */
export function TypographyControls({ theme, onChange }: TypographyControlsProps) {
  const { typography } = theme
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {FONT_ROLES.map((role) => (
          <Field key={role} label={`${ROLE_LABELS[role]} font`}>
            <FontSelect value={typography.fonts[role]} onChange={(font) => onChange(withRoleFont(theme, role, font))} />
          </Field>
        ))}
      </div>
      <RangeField
        label="Text scale"
        value={typography.scale}
        min={SCALE_RANGE.min}
        max={SCALE_RANGE.max}
        display={`${typography.scale}%`}
        onChange={(scale) => onChange(withScale(theme, scale))}
      />
      <div className="space-y-2">
        <span className="block text-sm font-medium text-ink-soft">Each text</span>
        {TEXT_ELEMENTS.map((element) => (
          <ElementControls key={element} theme={theme} element={element} onChange={onChange} />
        ))}
      </div>
    </div>
  )
}
