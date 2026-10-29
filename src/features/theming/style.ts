import type { CSSProperties } from 'react'
import type { BackgroundPattern, ColorField, ContrastWarning, ThemeColors } from './api.ts'

/** WCAG AA for normal text. */
export const MIN_CONTRAST = 4.5

const NEAR_BLACK = '#09090b'
const WHITE = '#ffffff'

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)) as [number, number, number]
}

function toHex([red, green, blue]: number[]): string {
  return `#${[red, green, blue].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`
}

/** `weight` of `first` and the rest of `second` (both `#rrggbb`). */
export function mixColors(first: string, second: string, weight: number): string {
  const a = channels(first)
  const b = channels(second)
  return toHex(a.map((value, index) => value * weight + b[index] * (1 - weight)))
}

function luminance(hex: string): number {
  const [red, green, blue] = channels(hex).map((value) => {
    const channel = value / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((x, y) => y - x)
  return (lighter + 0.05) / (darker + 0.05)
}

export function readableTextOn(background: string): string {
  return contrastRatio(WHITE, background) >= contrastRatio(NEAR_BLACK, background) ? WHITE : NEAR_BLACK
}

/** (text, background it sits on), as the menu draws them; the server checks the same pairs. */
const READABLE_PAIRS: [ColorField, ColorField][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['text_muted', 'surface'],
  ['price', 'surface'],
  ['button_text', 'button_bg'],
  ['badge_text', 'badge_bg'],
  ['cart_text', 'cart_bg'],
]

export function contrastWarnings(colors: ThemeColors): ContrastWarning[] {
  return READABLE_PAIRS.flatMap(([foreground, background]) => {
    const ratio = contrastRatio(colors[foreground], colors[background])
    return ratio < MIN_CONTRAST ? [{ foreground, background, ratio: Math.round(ratio * 100) / 100 }] : []
  })
}

/**
 * The CSS variables of a palette. The menu components only use these tokens (bg-surface, text-ink...),
 * whose defaults in index.css are the app's neutral colors; a themed scope sets them on its root.
 */
export function themeVariables(colors: ThemeColors): Record<string, string> {
  return {
    '--color-canvas': colors.background,
    '--color-surface': colors.surface,
    '--color-ink': colors.text,
    '--color-ink-soft': mixColors(colors.text, colors.surface, 0.8),
    '--color-muted': colors.text_muted,
    '--color-faint': mixColors(colors.text_muted, colors.surface, 0.7),
    '--color-line': colors.border,
    '--color-line-strong': mixColors(colors.text, colors.border, 0.15),
    '--color-subtle': mixColors(colors.text, colors.surface, 0.06),
    '--color-price': colors.price,
    '--color-brand': colors.primary,
    '--color-brand-ink': readableTextOn(colors.primary),
    '--color-secondary': colors.secondary,
    '--color-accent': colors.accent,
    '--color-action': colors.button_bg,
    '--color-action-ink': colors.button_text,
    '--color-action-hover': colors.button_hover,
    '--color-badge': colors.badge_bg,
    '--color-badge-ink': colors.badge_text,
    '--color-cart': colors.cart_bg,
    '--color-cart-ink': colors.cart_text,
    'color-scheme': colors.mode,
  }
}

/** The curated background patterns, drawn with CSS gradients in one color (no external images). */
export function backgroundPatternStyle(pattern: BackgroundPattern, color: string): CSSProperties {
  switch (pattern) {
    case 'dots':
      return { backgroundImage: `radial-gradient(${color} 1.5px, transparent 1.5px)`, backgroundSize: '16px 16px' }
    case 'grid':
      return {
        backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }
    case 'stripes':
      return {
        backgroundImage: `repeating-linear-gradient(45deg, ${color} 0 2px, transparent 2px 12px)`,
        backgroundSize: '17px 17px',
      }
    case 'waves':
      return {
        backgroundImage: `radial-gradient(circle at 50% 100%, transparent 9px, ${color} 10px, transparent 11px)`,
        backgroundSize: '24px 12px',
      }
    case 'checks':
      return {
        backgroundImage: `conic-gradient(${color} 25%, transparent 0 50%, ${color} 0 75%, transparent 0)`,
        backgroundSize: '24px 24px',
      }
    case 'zigzag':
      return {
        backgroundImage: `linear-gradient(135deg, ${color} 25%, transparent 25%), linear-gradient(225deg, ${color} 25%, transparent 25%)`,
        backgroundSize: '16px 16px',
      }
  }
}
