import type { FontId, FontRole, FontStyle, TextAlign, TextElement, TextStyle, TextTransform, Typography } from './api.ts'

export interface Font {
  family: string
  /** What the browser uses until (or if) the family loads. */
  fallback: string
  weights: number[]
  italic: boolean
}

function span(low: number, high: number): number[] {
  return Array.from({ length: (high - low) / 100 + 1 }, (_, index) => low + index * 100)
}

const SANS = 'ui-sans-serif, system-ui, sans-serif'
const SERIF = 'ui-serif, Georgia, serif'

/** The curated list; the server validates against the same ids, weights and italics. */
export const FONTS: Record<FontId, Font> = {
  geist: { family: 'Geist', fallback: SANS, weights: span(100, 900), italic: false },
  inter: { family: 'Inter', fallback: SANS, weights: span(100, 900), italic: true },
  poppins: { family: 'Poppins', fallback: SANS, weights: span(100, 900), italic: true },
  montserrat: { family: 'Montserrat', fallback: SANS, weights: span(100, 900), italic: true },
  lato: { family: 'Lato', fallback: SANS, weights: [100, 300, 400, 700, 900], italic: true },
  nunito: { family: 'Nunito', fallback: SANS, weights: span(200, 900), italic: true },
  playfair_display: { family: 'Playfair Display', fallback: SERIF, weights: span(400, 900), italic: true },
  lora: { family: 'Lora', fallback: SERIF, weights: span(400, 700), italic: true },
  merriweather: { family: 'Merriweather', fallback: SERIF, weights: [300, 400, 700, 900], italic: true },
  oswald: { family: 'Oswald', fallback: SANS, weights: span(200, 700), italic: false },
  bebas_neue: { family: 'Bebas Neue', fallback: SANS, weights: [400], italic: false },
  pacifico: { family: 'Pacifico', fallback: 'cursive', weights: [400], italic: false },
  caveat: { family: 'Caveat', fallback: 'cursive', weights: span(400, 700), italic: false },
}

export const FONT_ROLES: FontRole[] = ['heading', 'body', 'price', 'button']
export const TEXT_ELEMENTS: TextElement[] = ['business_name', 'category', 'product_name', 'description', 'price', 'button']

export const SCALE_RANGE = { min: 80, max: 130 }
export const SIZE_RANGE = { min: 10, max: 72 }
export const LINE_HEIGHT_RANGE = { min: 100, max: 200 }
export const LETTER_SPACING_RANGE = { min: -50, max: 200 }

function text(font: FontRole, size: number, weight: number, lineHeight: number, letterSpacing = 0): TextStyle {
  return {
    font,
    size,
    weight,
    style: 'normal',
    line_height: lineHeight,
    letter_spacing: letterSpacing,
    transform: 'none',
    align: 'left',
  }
}

/** The server's default typography: the menu as it looked before it could be customized. */
export const DEFAULT_TYPOGRAPHY: Typography = {
  scale: 100,
  fonts: { heading: 'geist', body: 'geist', price: 'geist', button: 'geist' },
  elements: {
    business_name: { ...text('heading', 30, 600, 120, -25), align: 'center' },
    category: text('heading', 20, 600, 140, -25),
    product_name: text('heading', 16, 600, 150),
    description: text('body', 14, 400, 143),
    price: text('price', 16, 600, 150),
    button: text('button', 14, 600, 143),
  },
}

/** The font of an id; an id outside the curated list (the server never sends one) draws with Geist. */
function fontOf(id: FontId): Font {
  return FONTS[id] ?? FONTS.geist
}

function fontStack(id: FontId): string {
  const font = fontOf(id)
  return `"${font.family}", ${font.fallback}`
}

function cssName(element: TextElement): string {
  return element.replace('_', '-')
}

/**
 * The CSS variables of a typography: `--type-<element>-<property>` for each element (the `type-*` classes in
 * index.css read them) and `--type-body-family` for the rest of the menu's text.
 */
export function typographyVariables(typography: Typography): Record<string, string> {
  const variables: Record<string, string> = { '--type-body-family': fontStack(typography.fonts.body) }
  for (const element of TEXT_ELEMENTS) {
    const style = typography.elements[element]
    const prefix = `--type-${cssName(element)}`
    variables[`${prefix}-family`] = fontStack(typography.fonts[style.font])
    variables[`${prefix}-size`] = `${Math.round(style.size * typography.scale) / 100}px`
    variables[`${prefix}-weight`] = String(style.weight)
    variables[`${prefix}-style`] = style.style
    variables[`${prefix}-line-height`] = String(style.line_height / 100)
    variables[`${prefix}-letter-spacing`] = `${style.letter_spacing / 1000}em`
    variables[`${prefix}-transform`] = style.transform
    variables[`${prefix}-align`] = style.align
  }
  return variables
}

/** Geist faces index.html already loads for the whole app. */
const APP_LOADED_GEIST = new Set(['normal 400', 'normal 500', 'normal 600', 'normal 700'])

/**
 * The Google Fonts stylesheet with only the families, weights and italics the elements use, or null when
 * the app already has them all. Built only from the curated list, never from free text.
 */
export function googleFontsUrl(typography: Typography): string | null {
  const faces = new Map<FontId, Set<string>>()
  for (const element of TEXT_ELEMENTS) {
    const style = typography.elements[element]
    const id = typography.fonts[style.font]
    const face = `${style.style} ${style.weight}`
    if (id === 'geist' && APP_LOADED_GEIST.has(face)) continue
    faces.set(id, (faces.get(id) ?? new Set()).add(face))
  }
  if (faces.size === 0) return null

  const families = [...faces.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([id, used]) => {
      const font = fontOf(id)
      const pairs = [...used]
        .map((face) => {
          const [style, weight] = face.split(' ')
          return [style === 'italic' ? 1 : 0, Number(weight)] as const
        })
        .sort(([italicA, weightA], [italicB, weightB]) => italicA - italicB || weightA - weightB)
      const name = font.family.replaceAll(' ', '+')
      const axes = font.italic
        ? `ital,wght@${pairs.map(([italic, weight]) => `${italic},${weight}`).join(';')}`
        : `wght@${pairs.map(([, weight]) => weight).join(';')}`
      return `family=${name}:${axes}`
    })
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`
}

/** The style moved to what that font has: the closest weight (ties go lighter) and upright without italics. */
export function fitToFont(style: TextStyle, id: FontId): TextStyle {
  const font = fontOf(id)
  const weight = font.weights.reduce((best, candidate) =>
    Math.abs(candidate - style.weight) < Math.abs(best - style.weight) ? candidate : best,
  )
  return { ...style, weight, style: font.italic ? style.style : 'normal' }
}

const FONT_IDS = Object.keys(FONTS) as FontId[]
const FONT_STYLES: FontStyle[] = ['normal', 'italic']
const TEXT_TRANSFORMS: TextTransform[] = ['none', 'uppercase', 'lowercase', 'capitalize']
const TEXT_ALIGNS: TextAlign[] = ['left', 'center', 'right']

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function oneOf<T extends string>(value: unknown, options: T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback
}

function whole(value: unknown, range: { min: number; max: number }, fallback: number): number {
  return Number.isInteger(value) && (value as number) >= range.min && (value as number) <= range.max
    ? (value as number)
    : fallback
}

/** One element's style; anything missing or unknown takes the default element's value, fitted to the font. */
function normalizeTextStyle(raw: unknown, fallback: TextStyle, fonts: Record<FontRole, FontId>): TextStyle {
  const value = record(raw)
  const role = oneOf(value.font, FONT_ROLES, fallback.font)
  const font = fontOf(fonts[role])
  const fitted = fitToFont({ ...fallback, font: role }, fonts[role])
  const weight = typeof value.weight === 'number' && font.weights.includes(value.weight) ? value.weight : fitted.weight
  const style = oneOf(value.style, FONT_STYLES, fallback.style)
  return {
    font: role,
    size: whole(value.size, SIZE_RANGE, fallback.size),
    weight,
    style: font.italic ? style : 'normal',
    line_height: whole(value.line_height, LINE_HEIGHT_RANGE, fallback.line_height),
    letter_spacing: whole(value.letter_spacing, LETTER_SPACING_RANGE, fallback.letter_spacing),
    transform: oneOf(value.transform, TEXT_TRANSFORMS, fallback.transform),
    align: oneOf(value.align, TEXT_ALIGNS, fallback.align),
  }
}

/**
 * The typography as the menu can draw it: an unknown font id draws with Geist, and any missing or unknown element,
 * weight, style or out of range number takes the default typography's value instead of breaking the page.
 */
export function normalizeTypography(raw: unknown): Typography {
  const value = record(raw)
  const rawFonts = record(value.fonts)
  const rawElements = record(value.elements)
  const d = DEFAULT_TYPOGRAPHY
  const fonts = Object.fromEntries(
    FONT_ROLES.map((role) => [role, oneOf(rawFonts[role], FONT_IDS, 'geist')]),
  ) as Record<FontRole, FontId>
  const elements = Object.fromEntries(
    TEXT_ELEMENTS.map((element) => [element, normalizeTextStyle(rawElements[element], d.elements[element], fonts)]),
  ) as Record<TextElement, TextStyle>
  return { scale: whole(value.scale, SCALE_RANGE, d.scale), fonts, elements }
}
