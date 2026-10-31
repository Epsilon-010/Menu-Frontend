import type {
  BackgroundKind,
  BackgroundPattern,
  BannerHeight,
  ColorField,
  LogoPosition,
  LogoSize,
  ThemeBrand,
  ThemeColors,
} from './api.ts'
import { BACKGROUND_PATTERNS, MAX_BLUR } from './api.ts'

/** The server's default light palette (also the default theme's colors). */
export const DEFAULT_LIGHT_COLORS: ThemeColors = {
  mode: 'light',
  primary: '#c2410c',
  secondary: '#1f2937',
  accent: '#f59e0b',
  background: '#fafaf9',
  surface: '#ffffff',
  text: '#18181b',
  text_muted: '#52525b',
  price: '#9a3412',
  button_bg: '#c2410c',
  button_text: '#ffffff',
  button_hover: '#9a3412',
  border: '#e4e4e7',
  badge_bg: '#fef3c7',
  badge_text: '#92400e',
  cart_bg: '#18181b',
  cart_text: '#ffffff',
  gradient: { enabled: false, from: '#c2410c', to: '#f59e0b', angle: 135 },
}

/** The server's default dark palette. */
export const DEFAULT_DARK_COLORS: ThemeColors = {
  mode: 'dark',
  primary: '#fb923c',
  secondary: '#e4e4e7',
  accent: '#fbbf24',
  background: '#09090b',
  surface: '#18181b',
  text: '#fafafa',
  text_muted: '#a1a1aa',
  price: '#fdba74',
  button_bg: '#fb923c',
  button_text: '#09090b',
  button_hover: '#fdba74',
  border: '#3f3f46',
  badge_bg: '#422006',
  badge_text: '#fde68a',
  cart_bg: '#fafafa',
  cart_text: '#09090b',
  gradient: { enabled: false, from: '#fb923c', to: '#fbbf24', angle: 135 },
}

/** The server's default brand: no name (the menu shows the business name), no images. */
export const DEFAULT_BRAND: ThemeBrand = {
  name: '',
  tagline: '',
  welcome_message: '',
  logo: { image_id: null, size: 'md', position: 'center' },
  banner: { image_id: null, height: 'md', overlay_color: '#000000', overlay_opacity: 30 },
  background: { kind: 'none', image_id: null, pattern: 'dots', opacity: 10, blur: 0 },
}

const COLOR_FIELDS = Object.keys(DEFAULT_LIGHT_COLORS).filter(
  (key) => key !== 'mode' && key !== 'gradient',
) as ColorField[]
const LOGO_SIZES: LogoSize[] = ['sm', 'md', 'lg']
const LOGO_POSITIONS: LogoPosition[] = ['left', 'center']
const BANNER_HEIGHTS: BannerHeight[] = ['sm', 'md', 'lg']
const BACKGROUND_KINDS: BackgroundKind[] = ['none', 'image', 'pattern']
/** The server always sends colors as `#rrggbb`, and the color math reads exactly that. */
const HEX_COLOR = /^#[0-9a-f]{6}$/i

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function oneOf<T extends string>(value: unknown, options: T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback
}

function whole(value: unknown, low: number, high: number, fallback: number): number {
  return Number.isInteger(value) && (value as number) >= low && (value as number) <= high ? (value as number) : fallback
}

function color(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX_COLOR.test(value) ? value : fallback
}

/** Lengths stay the server's check: it counts code points, so an emoji-rich name would look too long here. */
function text(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function imageId(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

/**
 * The palette as the menu can draw it: a missing or odd color (or gradient) falls back to the default palette of
 * the theme's mode instead of breaking the page.
 */
export function normalizeColors(raw: unknown): ThemeColors {
  const value = record(raw)
  const d = value.mode === 'dark' ? DEFAULT_DARK_COLORS : DEFAULT_LIGHT_COLORS
  const gradient = record(value.gradient)
  const colors = { mode: d.mode } as ThemeColors
  for (const field of COLOR_FIELDS) colors[field] = color(value[field], d[field])
  colors.gradient = {
    enabled: typeof gradient.enabled === 'boolean' ? gradient.enabled : d.gradient.enabled,
    from: color(gradient.from, d.gradient.from),
    to: color(gradient.to, d.gradient.to),
    angle: whole(gradient.angle, 0, 360, d.gradient.angle),
  }
  return colors
}

/** The brand as the menu can draw it: a missing or odd value falls back to the default brand. */
export function normalizeBrand(raw: unknown): ThemeBrand {
  const value = record(raw)
  const logo = record(value.logo)
  const banner = record(value.banner)
  const background = record(value.background)
  const d = DEFAULT_BRAND
  return {
    name: text(value.name, d.name),
    tagline: text(value.tagline, d.tagline),
    welcome_message: text(value.welcome_message, d.welcome_message),
    logo: {
      image_id: imageId(logo.image_id),
      size: oneOf(logo.size, LOGO_SIZES, d.logo.size),
      position: oneOf(logo.position, LOGO_POSITIONS, d.logo.position),
    },
    banner: {
      image_id: imageId(banner.image_id),
      height: oneOf(banner.height, BANNER_HEIGHTS, d.banner.height),
      overlay_color: color(banner.overlay_color, d.banner.overlay_color),
      overlay_opacity: whole(banner.overlay_opacity, 0, 100, d.banner.overlay_opacity),
    },
    background: {
      kind: oneOf(background.kind, BACKGROUND_KINDS, d.background.kind),
      image_id: imageId(background.image_id),
      pattern: oneOf<BackgroundPattern>(background.pattern, BACKGROUND_PATTERNS, d.background.pattern),
      opacity: whole(background.opacity, 0, 100, d.background.opacity),
      blur: whole(background.blur, 0, MAX_BLUR, d.background.blur),
    },
  }
}
