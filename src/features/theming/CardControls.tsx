import type {
  AddButtonStyle,
  BadgeShape,
  BorderColor,
  BorderWidth,
  ButtonShape,
  CardAnimation,
  CardBlock,
  CardHover,
  CardPadding,
  CardRadius,
  CardShadow,
  CardTemplate,
  ImageAspect,
  ImageFit,
  ImagePosition,
  PricePosition,
  Theme,
  ThemeCards,
} from './api.ts'
import {
  ADD_BUTTON_STYLES,
  BADGE_SHAPES,
  BORDER_COLORS,
  BORDER_WIDTHS,
  BUTTON_SHAPES,
  CARD_ANIMATIONS,
  CARD_HOVERS,
  CARD_PADDINGS,
  CARD_RADII,
  CARD_SHADOWS,
  CARD_TEMPLATES,
  IMAGE_ASPECTS,
  IMAGE_FITS,
  IMAGE_POSITIONS,
  MAX_DESCRIPTION_LINES,
  MAX_OVERLAY_OPACITY,
  MIN_DESCRIPTION_LINES,
  MIN_OVERLAY_OPACITY,
  PRICE_POSITIONS,
} from './cards.ts'
import { Choice, SliderField } from './Choice.tsx'
import { withCardBlocks, withCards } from './editor.ts'
import { SortableBlocks } from './SortableBlocks.tsx'

// Records keyed by every option: a new option cannot ship without its label.
const TEMPLATE_LABELS: Record<CardTemplate, string> = {
  vertical: 'Vertical: imagen arriba',
  horizontal: 'Horizontal: imagen junto al texto',
  overlay: 'Imagen completa con el texto encima',
}
const BLOCK_LABELS: Record<CardBlock, string> = {
  image: 'Imagen',
  heading: 'Nombre y precio',
  description: 'Descripción',
  badges: 'Etiquetas',
  add_button: 'Botón de agregar',
}
const ASPECT_LABELS: Record<ImageAspect, string> = { square: 'Cuadrada', landscape: '4:3', wide: '16:9' }
const FIT_LABELS: Record<ImageFit, string> = { cover: 'Llenar y recortar', contain: 'Mostrarla completa' }
const POSITION_LABELS: Record<ImagePosition, string> = { left: 'Izquierda', right: 'Derecha' }
const RADIUS_LABELS: Record<CardRadius, string> = {
  none: 'Rectas',
  sm: 'Poco redondeadas',
  md: 'Redondeadas',
  lg: 'Más redondeadas',
  xl: 'Muy redondeadas',
}
const SHADOW_LABELS: Record<CardShadow, string> = { none: 'Ninguna', sm: 'Suave', md: 'Media', lg: 'Fuerte' }
const BORDER_WIDTH_LABELS: Record<BorderWidth, string> = { none: 'Sin borde', thin: 'Delgado', thick: 'Grueso' }
const BORDER_COLOR_LABELS: Record<BorderColor, string> = {
  border: 'Color de bordes',
  primary: 'Color primario',
  accent: 'Color de acento',
}
const PADDING_LABELS: Record<CardPadding, string> = { compact: 'Compacto', comfortable: 'Cómodo', spacious: 'Amplio' }
const PRICE_LABELS: Record<PricePosition, string> = { top: 'Junto al nombre', bottom: 'Junto al botón' }
const BUTTON_STYLE_LABELS: Record<AddButtonStyle, string> = {
  text: 'La palabra "Agregar"',
  icon: 'Solo el ícono de más',
  both: 'Ícono y texto',
}
const BUTTON_SHAPE_LABELS: Record<ButtonShape, string> = { square: 'Cuadrado', rounded: 'Redondeado', pill: 'Píldora' }
const HOVER_LABELS: Record<CardHover, string> = { none: 'Ninguno', lift: 'Elevar', grow: 'Agrandar' }
const ANIMATION_LABELS: Record<CardAnimation, string> = { none: 'Ninguna', fade: 'Aparecer', rise: 'Subir al aparecer' }
const BADGE_SHAPE_LABELS: Record<BadgeShape, string> = { pill: 'Píldora', rounded: 'Redondeada' }

const LINES = Array.from(
  { length: MAX_DESCRIPTION_LINES - MIN_DESCRIPTION_LINES + 1 },
  (_, index) => String(MIN_DESCRIPTION_LINES + index),
)
const LINE_LABELS: Record<string, string> = Object.fromEntries(
  LINES.map((lines) => [lines, lines === '0' ? 'Ocultar la descripción' : lines]),
)

interface CardControlsProps {
  theme: Theme
  onChange: (theme: Theme) => void
}

/** How each product card looks: template, order of its parts, image, shape, add button, motion and badges. */
export function CardControls({ theme, onChange }: CardControlsProps) {
  const { cards } = theme
  const set = (changes: Partial<ThemeCards>) => onChange(withCards(theme, changes))
  const listView = theme.layout.product_view === 'list'
  const horizontal = listView || cards.template === 'horizontal'

  return (
    <div className="space-y-6">
      <Choice
        label="Plantilla de tarjeta"
        value={cards.template}
        options={CARD_TEMPLATES}
        labels={TEMPLATE_LABELS}
        onChange={(template) => set({ template })}
        hint={
          listView
            ? 'La vista de lista siempre dibuja filas horizontales; la plantilla aplica a la cuadrícula y al carrusel.'
            : 'Los productos sin imagen muestran una tarjeta simple.'
        }
      />

      <SortableBlocks
        label="Orden de la tarjeta"
        hint={
          cards.template === 'vertical' && !listView
            ? 'El precio sigue la opción Precio: junto al nombre o junto al botón.'
            : 'La imagen solo cambia de lugar con la plantilla vertical; aquí queda fija y se ordena el texto.'
        }
        blocks={cards.blocks}
        labels={BLOCK_LABELS}
        onChange={(blocks) => onChange(withCardBlocks(theme, blocks))}
      />

      <fieldset className="grid gap-4 @sm:grid-cols-2 @md:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold text-ink">Imagen</legend>
        <Choice
          label="Forma"
          value={cards.image.aspect}
          options={IMAGE_ASPECTS}
          labels={ASPECT_LABELS}
          disabled={horizontal}
          onChange={(aspect) => set({ image: { ...cards.image, aspect } })}
        />
        <Choice
          label="Ajuste"
          value={cards.image.fit}
          options={IMAGE_FITS}
          labels={FIT_LABELS}
          onChange={(fit) => set({ image: { ...cards.image, fit } })}
        />
        <Choice
          label="Lado"
          value={cards.image.position}
          options={IMAGE_POSITIONS}
          labels={POSITION_LABELS}
          disabled={!horizontal}
          onChange={(position) => set({ image: { ...cards.image, position } })}
        />
      </fieldset>

      {cards.template === 'overlay' && !listView && (
        <SliderField
          label="Oscurecer bajo el texto"
          value={cards.overlay_opacity}
          min={MIN_OVERLAY_OPACITY}
          max={MAX_OVERLAY_OPACITY}
          display={`${cards.overlay_opacity}%`}
          onChange={(overlay_opacity) => set({ overlay_opacity })}
        />
      )}

      <fieldset className="grid gap-4 @sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-ink">Tarjeta</legend>
        <Choice
          label="Esquinas"
          value={cards.radius}
          options={CARD_RADII}
          labels={RADIUS_LABELS}
          onChange={(radius) => set({ radius })}
        />
        <Choice
          label="Sombra"
          value={cards.shadow}
          options={CARD_SHADOWS}
          labels={SHADOW_LABELS}
          onChange={(shadow) => set({ shadow })}
        />
        <Choice
          label="Borde"
          value={cards.border.width}
          options={BORDER_WIDTHS}
          labels={BORDER_WIDTH_LABELS}
          onChange={(width) => set({ border: { ...cards.border, width } })}
        />
        <Choice
          label="Color del borde"
          value={cards.border.color}
          options={BORDER_COLORS}
          labels={BORDER_COLOR_LABELS}
          disabled={cards.border.width === 'none'}
          onChange={(color) => set({ border: { ...cards.border, color } })}
        />
        <Choice
          label="Espacio interior"
          value={cards.padding}
          options={CARD_PADDINGS}
          labels={PADDING_LABELS}
          onChange={(padding) => set({ padding })}
        />
        <Choice
          label="Líneas de descripción"
          kind="select"
          value={String(cards.description_lines)}
          options={LINES}
          labels={LINE_LABELS}
          onChange={(lines) => set({ description_lines: Number(lines) })}
        />
        <Choice
          label="Precio"
          value={cards.price_position}
          options={PRICE_POSITIONS}
          labels={PRICE_LABELS}
          onChange={(price_position) => set({ price_position })}
        />
        <Choice
          label="Etiquetas"
          value={cards.badge_shape}
          options={BADGE_SHAPES}
          labels={BADGE_SHAPE_LABELS}
          onChange={(badge_shape) => set({ badge_shape })}
        />
      </fieldset>

      <fieldset className="grid gap-4 @sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-ink">Botón de agregar</legend>
        <Choice
          label="Contenido"
          value={cards.add_button.style}
          options={ADD_BUTTON_STYLES}
          labels={BUTTON_STYLE_LABELS}
          onChange={(style) => set({ add_button: { ...cards.add_button, style } })}
        />
        <Choice
          label="Forma del botón"
          value={cards.add_button.shape}
          options={BUTTON_SHAPES}
          labels={BUTTON_SHAPE_LABELS}
          onChange={(shape) => set({ add_button: { ...cards.add_button, shape } })}
        />
      </fieldset>

      <fieldset className="grid gap-4 @sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-ink">Movimiento</legend>
        <Choice
          label="Al pasar el cursor"
          value={cards.hover}
          options={CARD_HOVERS}
          labels={HOVER_LABELS}
          onChange={(hover) => set({ hover })}
        />
        <Choice
          label="Al aparecer las tarjetas"
          value={cards.animation}
          options={CARD_ANIMATIONS}
          labels={ANIMATION_LABELS}
          onChange={(animation) => set({ animation })}
          hint="Se desactiva para quien pide a su dispositivo reducir el movimiento."
        />
      </fieldset>
    </div>
  )
}
