import { Field, Select } from '../../shared/ui/Field.tsx'
import type {
  AddButtonStyle,
  BadgeShape,
  BorderColor,
  BorderWidth,
  ButtonShape,
  CardAnimation,
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
import { Choice } from './Choice.tsx'
import { withCards } from './editor.ts'

// Records keyed by every option: a new option cannot ship without its label.
const TEMPLATE_LABELS: Record<CardTemplate, string> = {
  vertical: 'Vertical: image on top',
  horizontal: 'Horizontal: image beside the text',
  overlay: 'Full image with the text over it',
}
const ASPECT_LABELS: Record<ImageAspect, string> = { square: 'Square (1:1)', landscape: 'Landscape (4:3)', wide: 'Wide (16:9)' }
const FIT_LABELS: Record<ImageFit, string> = { cover: 'Fill and crop', contain: 'Show it whole' }
const POSITION_LABELS: Record<ImagePosition, string> = { left: 'Left', right: 'Right' }
const RADIUS_LABELS: Record<CardRadius, string> = {
  none: 'Square',
  sm: 'Slightly rounded',
  md: 'Rounded',
  lg: 'More rounded',
  xl: 'Very rounded',
}
const SHADOW_LABELS: Record<CardShadow, string> = { none: 'None', sm: 'Soft', md: 'Medium', lg: 'Strong' }
const BORDER_WIDTH_LABELS: Record<BorderWidth, string> = { none: 'No border', thin: 'Thin', thick: 'Thick' }
const BORDER_COLOR_LABELS: Record<BorderColor, string> = {
  border: 'Border color',
  primary: 'Primary color',
  accent: 'Accent color',
}
const PADDING_LABELS: Record<CardPadding, string> = { compact: 'Compact', comfortable: 'Comfortable', spacious: 'Spacious' }
const PRICE_LABELS: Record<PricePosition, string> = { top: 'Next to the name', bottom: 'Next to the button' }
const BUTTON_STYLE_LABELS: Record<AddButtonStyle, string> = {
  text: 'The word "Add"',
  icon: 'Plus icon only',
  both: 'Icon and text',
}
const BUTTON_SHAPE_LABELS: Record<ButtonShape, string> = { square: 'Square', rounded: 'Rounded', pill: 'Pill' }
const HOVER_LABELS: Record<CardHover, string> = { none: 'None', lift: 'Lift', grow: 'Grow' }
const ANIMATION_LABELS: Record<CardAnimation, string> = { none: 'None', fade: 'Fade in', rise: 'Rise in' }
const BADGE_SHAPE_LABELS: Record<BadgeShape, string> = { pill: 'Pill', rounded: 'Rounded' }

const LINES = Array.from(
  { length: MAX_DESCRIPTION_LINES - MIN_DESCRIPTION_LINES + 1 },
  (_, index) => MIN_DESCRIPTION_LINES + index,
)

interface CardControlsProps {
  theme: Theme
  onChange: (theme: Theme) => void
}

/** How each product card looks: template, image, shape, add button, motion and badges. */
export function CardControls({ theme, onChange }: CardControlsProps) {
  const { cards } = theme
  const set = (changes: Partial<ThemeCards>) => onChange(withCards(theme, changes))
  const listView = theme.layout.product_view === 'list'
  const horizontal = listView || cards.template === 'horizontal'

  return (
    <div className="space-y-6">
      <Choice
        label="Card template"
        value={cards.template}
        options={CARD_TEMPLATES}
        labels={TEMPLATE_LABELS}
        onChange={(template) => set({ template })}
        hint={
          listView
            ? 'The list view always draws horizontal rows; the template applies to the grid and the carousel.'
            : 'Products without an image show a plain card.'
        }
      />

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold text-ink">Image</legend>
        <Choice
          label="Shape"
          value={cards.image.aspect}
          options={IMAGE_ASPECTS}
          labels={ASPECT_LABELS}
          disabled={horizontal}
          onChange={(aspect) => set({ image: { ...cards.image, aspect } })}
        />
        <Choice
          label="Fit"
          value={cards.image.fit}
          options={IMAGE_FITS}
          labels={FIT_LABELS}
          onChange={(fit) => set({ image: { ...cards.image, fit } })}
        />
        <Choice
          label="Side"
          value={cards.image.position}
          options={IMAGE_POSITIONS}
          labels={POSITION_LABELS}
          disabled={!horizontal}
          onChange={(position) => set({ image: { ...cards.image, position } })}
        />
      </fieldset>

      {cards.template === 'overlay' && (
        <Field label={`Darkening under the text: ${cards.overlay_opacity}%`}>
          <input
            type="range"
            min={MIN_OVERLAY_OPACITY}
            max={MAX_OVERLAY_OPACITY}
            value={cards.overlay_opacity}
            onChange={(event) => set({ overlay_opacity: Number(event.target.value) })}
            className="w-full accent-zinc-950"
          />
        </Field>
      )}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-ink">Card</legend>
        <Choice
          label="Corners"
          value={cards.radius}
          options={CARD_RADII}
          labels={RADIUS_LABELS}
          onChange={(radius) => set({ radius })}
        />
        <Choice
          label="Shadow"
          value={cards.shadow}
          options={CARD_SHADOWS}
          labels={SHADOW_LABELS}
          onChange={(shadow) => set({ shadow })}
        />
        <Choice
          label="Border"
          value={cards.border.width}
          options={BORDER_WIDTHS}
          labels={BORDER_WIDTH_LABELS}
          onChange={(width) => set({ border: { ...cards.border, width } })}
        />
        <Choice
          label="Border color"
          value={cards.border.color}
          options={BORDER_COLORS}
          labels={BORDER_COLOR_LABELS}
          disabled={cards.border.width === 'none'}
          onChange={(color) => set({ border: { ...cards.border, color } })}
        />
        <Choice
          label="Inner spacing"
          value={cards.padding}
          options={CARD_PADDINGS}
          labels={PADDING_LABELS}
          onChange={(padding) => set({ padding })}
        />
        <Field label="Description lines">
          <Select
            value={cards.description_lines}
            onChange={(event) => set({ description_lines: Number(event.target.value) })}
          >
            {LINES.map((lines) => (
              <option key={lines} value={lines}>
                {lines === 0 ? 'Hide the description' : lines}
              </option>
            ))}
          </Select>
        </Field>
        <Choice
          label="Price"
          value={cards.price_position}
          options={PRICE_POSITIONS}
          labels={PRICE_LABELS}
          onChange={(price_position) => set({ price_position })}
        />
        <Choice
          label="Badges"
          value={cards.badge_shape}
          options={BADGE_SHAPES}
          labels={BADGE_SHAPE_LABELS}
          onChange={(badge_shape) => set({ badge_shape })}
        />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-ink">Add button</legend>
        <Choice
          label="Content"
          value={cards.add_button.style}
          options={ADD_BUTTON_STYLES}
          labels={BUTTON_STYLE_LABELS}
          onChange={(style) => set({ add_button: { ...cards.add_button, style } })}
        />
        <Choice
          label="Button shape"
          value={cards.add_button.shape}
          options={BUTTON_SHAPES}
          labels={BUTTON_SHAPE_LABELS}
          onChange={(shape) => set({ add_button: { ...cards.add_button, shape } })}
        />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-ink">Motion</legend>
        <Choice
          label="On hover"
          value={cards.hover}
          options={CARD_HOVERS}
          labels={HOVER_LABELS}
          onChange={(hover) => set({ hover })}
        />
        <Choice
          label="When cards appear"
          value={cards.animation}
          options={CARD_ANIMATIONS}
          labels={ANIMATION_LABELS}
          onChange={(animation) => set({ animation })}
          hint="Off for people who ask their device to reduce motion."
        />
      </fieldset>
    </div>
  )
}
