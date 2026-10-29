import type { ColorField, Theme, ThemeBrand, ThemeColors, ThemeMode } from './api.ts'

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
