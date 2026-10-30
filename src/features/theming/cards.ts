import { MOTION } from '../../shared/ui/classes.ts'
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
  ProductView,
  ThemeCards,
} from './api.ts'

export const CARD_TEMPLATES: CardTemplate[] = ['vertical', 'horizontal', 'overlay']
export const IMAGE_ASPECTS: ImageAspect[] = ['square', 'landscape', 'wide']
export const IMAGE_FITS: ImageFit[] = ['cover', 'contain']
export const IMAGE_POSITIONS: ImagePosition[] = ['left', 'right']
export const CARD_RADII: CardRadius[] = ['none', 'sm', 'md', 'lg', 'xl']
export const CARD_SHADOWS: CardShadow[] = ['none', 'sm', 'md', 'lg']
export const BORDER_WIDTHS: BorderWidth[] = ['none', 'thin', 'thick']
export const BORDER_COLORS: BorderColor[] = ['border', 'primary', 'accent']
export const CARD_PADDINGS: CardPadding[] = ['compact', 'comfortable', 'spacious']
export const PRICE_POSITIONS: PricePosition[] = ['top', 'bottom']
export const ADD_BUTTON_STYLES: AddButtonStyle[] = ['text', 'icon', 'both']
export const BUTTON_SHAPES: ButtonShape[] = ['square', 'rounded', 'pill']
export const CARD_HOVERS: CardHover[] = ['none', 'lift', 'grow']
export const CARD_ANIMATIONS: CardAnimation[] = ['none', 'fade', 'rise']
export const BADGE_SHAPES: BadgeShape[] = ['pill', 'rounded']
export const MIN_DESCRIPTION_LINES = 0
export const MAX_DESCRIPTION_LINES = 6
export const MIN_OVERLAY_OPACITY = 30
export const MAX_OVERLAY_OPACITY = 90

/** The card the menu had before the cards could be customized (the server's default too). */
export const DEFAULT_CARDS: ThemeCards = {
  template: 'vertical',
  image: { aspect: 'landscape', fit: 'cover', position: 'left' },
  radius: 'xl',
  shadow: 'none',
  border: { width: 'thin', color: 'border' },
  padding: 'comfortable',
  description_lines: 3,
  price_position: 'top',
  add_button: { style: 'both', shape: 'rounded' },
  hover: 'none',
  animation: 'none',
  overlay_opacity: 60,
  badge_shape: 'pill',
}

// Full class names (Tailwind only generates classes it sees written out).
const RADIUS: Record<CardRadius, string> = {
  none: 'rounded-none',
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
}
const SHADOW: Record<CardShadow, string> = { none: '', sm: 'shadow-sm', md: 'shadow-md', lg: 'shadow-lg' }
const BORDER_WIDTH: Record<BorderWidth, string> = { none: 'border-0', thin: 'border', thick: 'border-2' }
const BORDER_COLOR: Record<BorderColor, string> = { border: 'border-line', primary: 'border-brand', accent: 'border-accent' }
// Motion only for people who did not ask to reduce it.
const HOVER: Record<CardHover, string> = {
  none: '',
  lift: `${MOTION} motion-safe:hover:-translate-y-1 hover:shadow-lg`,
  grow: `${MOTION} motion-safe:hover:scale-[1.02]`,
}
const ANIMATION: Record<CardAnimation, string> = {
  none: '',
  fade: 'motion-safe:animate-card-fade',
  rise: 'motion-safe:animate-card-rise',
}
const ASPECT: Record<ImageAspect, string> = { square: 'aspect-square', landscape: 'aspect-[4/3]', wide: 'aspect-video' }
const FIT: Record<ImageFit, string> = { cover: 'object-cover', contain: 'object-contain' }
const PADDING: Record<CardPadding, string> = { compact: 'p-3', comfortable: 'p-4', spacious: 'p-6' }
const CLAMP: Record<number, string> = {
  1: 'line-clamp-1',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  5: 'line-clamp-5',
  6: 'line-clamp-6',
}
const SHAPE: Record<ButtonShape | BadgeShape, string> = {
  square: 'rounded-none',
  rounded: 'rounded-lg',
  pill: 'rounded-full',
}

/** The card's frame: corners, shadow, border, hover effect and entrance animation. */
export function cardShellClass(cards: ThemeCards): string {
  const border = cards.border.width === 'none' ? BORDER_WIDTH.none : `${BORDER_WIDTH[cards.border.width]} ${BORDER_COLOR[cards.border.color]}`
  return [RADIUS[cards.radius], SHADOW[cards.shadow], border, HOVER[cards.hover], ANIMATION[cards.animation]]
    .filter(Boolean)
    .join(' ')
}

export function cardAspectClass(cards: ThemeCards): string {
  return ASPECT[cards.image.aspect]
}

export function cardFitClass(cards: ThemeCards): string {
  return FIT[cards.image.fit]
}

/** Proportion and fit of the image on top of a vertical card. */
export function cardImageClass(cards: ThemeCards): string {
  return `${cardAspectClass(cards)} ${cardFitClass(cards)}`
}

export function cardPaddingClass(cards: ThemeCards): string {
  return PADDING[cards.padding]
}

/** The description's line clamp, or null when the theme hides descriptions. */
export function descriptionClampClass(lines: number): string | null {
  return CLAMP[lines] ?? null
}

/** Corners of the badges. */
export function pillShapeClass(shape: ButtonShape | BadgeShape): string {
  return SHAPE[shape]
}

// Important: they beat the corners every shared button already has.
const BUTTON_SHAPE: Record<ButtonShape, string> = { square: 'rounded-none!', rounded: 'rounded-lg!', pill: 'rounded-full!' }

/** Corners of the add button. */
export function buttonShapeClass(shape: ButtonShape): string {
  return BUTTON_SHAPE[shape]
}

/** List rows always lay the image beside the text; the grid and the carousel follow the theme's template. */
export function cardTemplate(view: ProductView, template: CardTemplate): CardTemplate {
  return view === 'list' ? 'horizontal' : template
}

function oneOf<T extends string>(value: unknown, options: T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback
}

function whole(value: unknown, low: number, high: number, fallback: number): number {
  return Number.isInteger(value) && (value as number) >= low && (value as number) <= high ? (value as number) : fallback
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

/**
 * The cards as the menu can draw them: any missing or unknown value (a server still on an older theme version while a
 * deploy rolls out) falls back to the default instead of breaking the page.
 */
export function normalizeCards(raw: unknown): ThemeCards {
  const value = record(raw)
  const image = record(value.image)
  const border = record(value.border)
  const button = record(value.add_button)
  const d = DEFAULT_CARDS
  return {
    template: oneOf(value.template, CARD_TEMPLATES, d.template),
    image: {
      aspect: oneOf(image.aspect, IMAGE_ASPECTS, d.image.aspect),
      fit: oneOf(image.fit, IMAGE_FITS, d.image.fit),
      position: oneOf(image.position, IMAGE_POSITIONS, d.image.position),
    },
    radius: oneOf(value.radius, CARD_RADII, d.radius),
    shadow: oneOf(value.shadow, CARD_SHADOWS, d.shadow),
    border: {
      width: oneOf(border.width, BORDER_WIDTHS, d.border.width),
      color: oneOf(border.color, BORDER_COLORS, d.border.color),
    },
    padding: oneOf(value.padding, CARD_PADDINGS, d.padding),
    description_lines: whole(value.description_lines, MIN_DESCRIPTION_LINES, MAX_DESCRIPTION_LINES, d.description_lines),
    price_position: oneOf(value.price_position, PRICE_POSITIONS, d.price_position),
    add_button: {
      style: oneOf(button.style, ADD_BUTTON_STYLES, d.add_button.style),
      shape: oneOf(button.shape, BUTTON_SHAPES, d.add_button.shape),
    },
    hover: oneOf(value.hover, CARD_HOVERS, d.hover),
    animation: oneOf(value.animation, CARD_ANIMATIONS, d.animation),
    overlay_opacity: whole(value.overlay_opacity, MIN_OVERLAY_OPACITY, MAX_OVERLAY_OPACITY, d.overlay_opacity),
    badge_shape: oneOf(value.badge_shape, BADGE_SHAPES, d.badge_shape),
  }
}
