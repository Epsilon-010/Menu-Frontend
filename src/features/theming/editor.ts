import type {
  ColorField,
  FontId,
  FontRole,
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

/** A preset replaces colors, typography, layout and cards; the brand (name, texts, images) stays the tenant's. */
export function withPreset(theme: Theme, preset: ThemePreset): Theme {
  return { ...theme, colors: preset.colors, typography: preset.typography, layout: preset.layout, cards: preset.cards }
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
