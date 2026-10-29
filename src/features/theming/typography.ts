import type { FontId, FontRole, TextElement, TextStyle, Typography } from './api.ts'

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

function fontStack(id: FontId): string {
  const font = FONTS[id]
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
      const font = FONTS[id]
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
  const font = FONTS[id]
  const weight = font.weights.reduce((best, candidate) =>
    Math.abs(candidate - style.weight) < Math.abs(best - style.weight) ? candidate : best,
  )
  return { ...style, weight, style: font.italic ? style.style : 'normal' }
}
