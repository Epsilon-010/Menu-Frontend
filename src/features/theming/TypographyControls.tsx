import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select.tsx'
import type { FontId, FontRole, FontStyle, TextAlign, TextElement, TextTransform, Theme } from './api.ts'
import { Choice, ControlField, SliderField } from './Choice.tsx'
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

const ROLE_LABELS: Record<FontRole, string> = { heading: 'Títulos', body: 'Cuerpo', price: 'Precios', button: 'Botones' }
const ELEMENT_LABELS: Record<TextElement, string> = {
  business_name: 'Nombre del negocio',
  category: 'Encabezado de categoría',
  product_name: 'Nombre del producto',
  description: 'Descripción',
  price: 'Precio',
  button: 'Botones',
}
const FONT_GROUPS: { label: string; fonts: FontId[] }[] = [
  { label: 'Sin serifa', fonts: ['geist', 'inter', 'poppins', 'montserrat', 'lato', 'nunito'] },
  { label: 'Con serifa', fonts: ['playfair_display', 'lora', 'merriweather'] },
  { label: 'Decorativas', fonts: ['oswald', 'bebas_neue'] },
  { label: 'Manuscritas', fonts: ['pacifico', 'caveat'] },
]
const TRANSFORM_LABELS: Record<TextTransform, string> = {
  none: 'Como está escrito',
  uppercase: 'MAYÚSCULAS',
  lowercase: 'minúsculas',
  capitalize: 'Mayúscula En Cada Palabra',
}
const ALIGN_LABELS: Record<TextAlign, string> = { left: 'Izquierda', center: 'Centro', right: 'Derecha' }
const STYLE_LABELS: Record<FontStyle, string> = { normal: 'Normal', italic: 'Cursiva' }
const TRANSFORMS = Object.keys(TRANSFORM_LABELS) as TextTransform[]
const ALIGNS = Object.keys(ALIGN_LABELS) as TextAlign[]
const STYLES = Object.keys(STYLE_LABELS) as FontStyle[]
// Price and buttons sit in a row, where alignment has no visible effect.
const ALIGNABLE: TextElement[] = ['business_name', 'category', 'product_name', 'description']

function FontSelect({ label, value, onChange }: { label: string; value: FontId; onChange: (font: FontId) => void }) {
  return (
    <ControlField label={label}>
      {({ controlId }) => (
        <Select value={value} onValueChange={(font) => onChange(font as FontId)}>
          <SelectTrigger id={controlId}>
            <SelectValue>{FONTS[value].family}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {FONT_GROUPS.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.fonts.map((font) => (
                  <SelectItem key={font} value={font}>
                    {FONTS[font].family}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      )}
    </ControlField>
  )
}

function ElementControls({ theme, element, onChange }: { theme: Theme; element: TextElement; onChange: (theme: Theme) => void }) {
  const style = theme.typography.elements[element]
  const font = FONTS[theme.typography.fonts[style.font]]
  const change = (changes: Parameters<typeof withTextStyle>[2]) => onChange(withTextStyle(theme, element, changes))
  const roleLabels = Object.fromEntries(
    FONT_ROLES.map((role) => [role, `${ROLE_LABELS[role]} (${FONTS[theme.typography.fonts[role]].family})`]),
  ) as Record<FontRole, string>
  const weights = font.weights.map(String)

  return (
    <details className="group rounded-xl border border-line bg-surface">
      <summary className="flex cursor-pointer items-center justify-between gap-4 rounded-xl px-3 py-2 text-sm font-semibold text-ink hover:bg-subtle">
        {ELEMENT_LABELS[element]}
        <span className="text-xs font-normal text-muted">
          {font.family} · {style.size}px · {style.weight}
        </span>
      </summary>
      <div className="grid gap-4 border-t border-line p-3 @sm:grid-cols-2">
        <Choice
          label="Fuente"
          kind="select"
          value={style.font}
          options={FONT_ROLES}
          labels={roleLabels}
          onChange={(role) => change({ font: role })}
        />
        <Choice
          label="Grosor"
          kind="select"
          value={String(style.weight)}
          options={weights}
          labels={Object.fromEntries(weights.map((weight) => [weight, weight]))}
          onChange={(weight) => change({ weight: Number(weight) })}
        />
        <Choice
          label="Estilo"
          hint={font.italic ? undefined : `${font.family} no tiene cursivas.`}
          value={style.style}
          options={STYLES}
          labels={STYLE_LABELS}
          disabled={!font.italic}
          onChange={(fontStyle) => change({ style: fontStyle })}
        />
        <Choice
          label="Mayúsculas y minúsculas"
          kind="select"
          value={style.transform}
          options={TRANSFORMS}
          labels={TRANSFORM_LABELS}
          onChange={(transform) => change({ transform })}
        />
        {ALIGNABLE.includes(element) && (
          <Choice
            label="Alineación"
            value={style.align}
            options={ALIGNS}
            labels={ALIGN_LABELS}
            onChange={(align) => change({ align })}
          />
        )}
        <SliderField
          label="Tamaño"
          value={style.size}
          min={SIZE_RANGE.min}
          max={SIZE_RANGE.max}
          display={`${style.size}px`}
          onChange={(size) => change({ size })}
        />
        <SliderField
          label="Interlineado"
          value={style.line_height}
          min={LINE_HEIGHT_RANGE.min}
          max={LINE_HEIGHT_RANGE.max}
          display={(style.line_height / 100).toFixed(2)}
          onChange={(line_height) => change({ line_height })}
        />
        <SliderField
          label="Espaciado entre letras"
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
      <div className="grid gap-4 @sm:grid-cols-2">
        {FONT_ROLES.map((role) => (
          <FontSelect
            key={role}
            label={`Fuente de ${ROLE_LABELS[role].toLowerCase()}`}
            value={typography.fonts[role]}
            onChange={(font) => onChange(withRoleFont(theme, role, font))}
          />
        ))}
      </div>
      <SliderField
        label="Escala del texto"
        value={typography.scale}
        min={SCALE_RANGE.min}
        max={SCALE_RANGE.max}
        display={`${typography.scale}%`}
        onChange={(scale) => onChange(withScale(theme, scale))}
      />
      <div className="space-y-2">
        <span className="block text-sm font-medium text-ink-soft">Cada texto</span>
        {TEXT_ELEMENTS.map((element) => (
          <ElementControls key={element} theme={theme} element={element} onChange={onChange} />
        ))}
      </div>
    </div>
  )
}
