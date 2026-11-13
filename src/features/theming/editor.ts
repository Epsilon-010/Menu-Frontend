import type {
  CardBlock,
  CategoryLayout,
  ColorField,
  FontId,
  UploadSlot,
  FontRole,
  HeaderBlock,
  TextElement,
  TextStyle,
  Theme,
  ThemeBrand,
  ThemeColors,
  ThemeCards,
  ThemeLayout,
  ThemeMode,
  ThemePreset,
} from './api.ts'
import { fitToFont, TEXT_ELEMENTS } from './typography.ts'

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

/** A typed hex color as the theme stores it (`#rrggbb`), or null when it is not one. */
export function parseHexInput(text: string): string | null {
  const match = HEX.exec(text.trim())
  if (!match) return null
  const digits = match[1].toLowerCase()
  return `#${digits.length === 6 ? digits : [...digits].map((digit) => digit + digit).join('')}`
}

export function withColor(theme: Theme, field: ColorField, value: string): Theme {
  return { ...theme, colors: { ...theme.colors, [field]: value } }
}

export function withGradient(theme: Theme, changes: Partial<ThemeColors['gradient']>): Theme {
  return { ...theme, colors: { ...theme.colors, gradient: { ...theme.colors.gradient, ...changes } } }
}

/** Switching mode starts again from that mode's default palette (the admin then adjusts it). */
export function withMode(theme: Theme, mode: ThemeMode, defaults: { light: ThemeColors; dark: ThemeColors }): Theme {
  return { ...theme, colors: defaults[mode] }
}

export function withBrand(theme: Theme, changes: Partial<ThemeBrand>): Theme {
  return { ...theme, brand: { ...theme.brand, ...changes } }
}

export function withScale(theme: Theme, scale: number): Theme {
  return { ...theme, typography: { ...theme.typography, scale } }
}

/** A role gets another font; the elements written with it move to weights and styles that font has. */
export function withRoleFont(theme: Theme, role: FontRole, font: FontId): Theme {
  const elements = { ...theme.typography.elements }
  for (const element of TEXT_ELEMENTS) {
    if (elements[element].font === role) elements[element] = fitToFont(elements[element], font)
  }
  return { ...theme, typography: { ...theme.typography, fonts: { ...theme.typography.fonts, [role]: font }, elements } }
}

/** Changes one element; it always stays within what its role font has (the server rejects anything else). */
export function withTextStyle(theme: Theme, element: TextElement, changes: Partial<TextStyle>): Theme {
  const changed = { ...theme.typography.elements[element], ...changes }
  const fitted = fitToFont(changed, theme.typography.fonts[changed.font])
  return { ...theme, typography: { ...theme.typography, elements: { ...theme.typography.elements, [element]: fitted } } }
}

export function withLayout(theme: Theme, changes: Partial<ThemeLayout>): Theme {
  return { ...theme, layout: { ...theme.layout, ...changes } }
}

export function withCards(theme: Theme, changes: Partial<ThemeCards>): Theme {
  return { ...theme, cards: { ...theme.cards, ...changes } }
}

export function withCardBlocks(theme: Theme, blocks: CardBlock[]): Theme {
  return withCards(theme, { blocks })
}

export function withHeaderBlocks(theme: Theme, header_blocks: HeaderBlock[]): Theme {
  return withLayout(theme, { header_blocks })
}

/** What a category starts with when it gets its own design: the general view, columns and card template. */
export function generalCategoryLayout(theme: Theme): CategoryLayout {
  return { product_view: theme.layout.product_view, columns: theme.layout.columns, card_template: theme.cards.template }
}

/** Gives a category its own layout, changes it, or (null) sends it back to the general layout. */
export function withCategoryLayout(theme: Theme, categoryId: string, value: CategoryLayout | null): Theme {
  if (value !== null) return withLayout(theme, { categories: { ...theme.layout.categories, [categoryId]: value } })
  const categories = Object.fromEntries(Object.entries(theme.layout.categories).filter(([id]) => id !== categoryId))
  return withLayout(theme, { categories })
}

/** A preset replaces colors, typography, layout and cards; the brand (name, texts, images) stays the tenant's. */
export function withPreset(theme: Theme, preset: ThemePreset): Theme {
  return { ...theme, colors: preset.colors, typography: preset.typography, layout: preset.layout, cards: preset.cards }
}

/**
 * Colors, typography, layout and cards back to the default design; the brand and the page's sections (the
 * business's own texts and pictures) stay. The server sends the default design as the first template (pinned by
 * its tests), so this is applying that template without its page.
 */
export function withDefaults(theme: Theme, presets: ThemePreset[]): Theme {
  if (presets.length === 0) return theme
  const reset = withPreset(theme, presets[0])
  return { ...reset, layout: { ...reset.layout, sections: theme.layout.sections } }
}

const NOT_A_DESIGN = 'Ese archivo no es un diseño de menú. Elige un archivo .json exportado desde este editor.'

/** The JSON object inside an exported file; the server checks every value when it is imported. */
export function readThemeFile(text: string): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(NOT_A_DESIGN)
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error(NOT_A_DESIGN)
  return parsed as Record<string, unknown>
}

/** `<business>-design-<yyyy-mm-dd>.json`, with only letters, digits and dashes. */
export function themeFileName(businessName: string, day: Date): string {
  const slug = businessName
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const date = [day.getFullYear(), day.getMonth() + 1, day.getDate()].map((part) => String(part).padStart(2, '0')).join('-')
  return `${slug ? `${slug}-design` : 'menu-design'}-${date}.json`
}

const SLOT_NAMES: Record<UploadSlot, string> = {
  logo: 'el logo',
  banner: 'el banner',
  background: 'la imagen de fondo',
  section: 'las fotos de la página',
}

/** The warning for images an import left out, or null when it kept them all. */
export function removedImagesText(slots: UploadSlot[]): string | null {
  if (slots.length === 0) return null
  const names = slots.map((slot) => SLOT_NAMES[slot])
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
  const one = slots.length === 1
  const reason = one
    ? 'quedó fuera: pertenece a otro negocio o ya no está en tus diseños. Sube la imagen de nuevo.'
    : 'quedaron fuera: pertenecen a otro negocio o ya no están en tus diseños. Sube las imágenes de nuevo.'
  return `${list[0].toUpperCase()}${list.slice(1)} ${reason}`
}

/** The preset the theme still looks exactly like, or null once the admin adjusted anything. */
export function matchingPreset(theme: Theme, presets: ThemePreset[]): string | null {
  const look = JSON.stringify([theme.colors, theme.typography, theme.layout, theme.cards])
  return (
    presets.find((preset) => JSON.stringify([preset.colors, preset.typography, preset.layout, preset.cards]) === look)?.id ?? null
  )
}

/**
 * The draft once a save or publish answers: the server copy (it may normalize values) unless the admin changed
 * the draft while the request was in flight. Those newer edits stay, still unsaved.
 */
export function keepNewerEdits(current: Theme, sent: Theme, saved: Theme): Theme {
  return JSON.stringify(current) === JSON.stringify(sent) ? saved : current
}
