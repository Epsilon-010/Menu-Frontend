import { describe, expect, it } from 'vitest'
import type { ThemeColors } from './api.ts'
import {
  backgroundPatternStyle,
  contrastRatio,
  contrastWarnings,
  mixColors,
  readableTextOn,
  themeVariables,
} from './style.ts'

const LIGHT: ThemeColors = {
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

describe('themeVariables', () => {
  it('maps every theme color to the CSS variable the menu components use', () => {
    const variables = themeVariables(LIGHT)
    expect(variables).toMatchObject({
      '--color-canvas': '#fafaf9',
      '--color-surface': '#ffffff',
      '--color-ink': '#18181b',
      '--color-muted': '#52525b',
      '--color-line': '#e4e4e7',
      '--color-price': '#9a3412',
      '--color-brand': '#c2410c',
      '--color-secondary': '#1f2937',
      '--color-accent': '#f59e0b',
      '--color-action': '#c2410c',
      '--color-action-ink': '#ffffff',
      '--color-action-hover': '#9a3412',
      '--color-badge': '#fef3c7',
      '--color-badge-ink': '#92400e',
      '--color-cart': '#18181b',
      '--color-cart-ink': '#ffffff',
      'color-scheme': 'light',
    })
    // Derived tones sit between the text and the surface, so they follow any palette.
    expect(variables['--color-ink-soft']).toBe(mixColors('#18181b', '#ffffff', 0.8))
    expect(variables['--color-subtle']).toBe(mixColors('#18181b', '#ffffff', 0.06))
    expect(variables['--color-brand-ink']).toBe(readableTextOn('#c2410c'))
  })

  it('every value is a plain color or keyword: nothing else can reach a style', () => {
    for (const [name, value] of Object.entries(themeVariables({ ...LIGHT, mode: 'dark' }))) {
      expect(name).toMatch(/^(--color-[a-z-]+|color-scheme)$/)
      expect(value).toMatch(/^(#[0-9a-f]{6}|light|dark)$/)
    }
  })
})

describe('colors', () => {
  it('mixes two colors by weight', () => {
    expect(mixColors('#000000', '#ffffff', 0)).toBe('#ffffff')
    expect(mixColors('#000000', '#ffffff', 1)).toBe('#000000')
    expect(mixColors('#000000', '#ffffff', 0.5)).toBe('#808080')
  })

  it('computes the WCAG contrast ratio', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21)
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2)
  })

  it('picks white or near black text, whichever reads better', () => {
    expect(readableTextOn('#18181b')).toBe('#ffffff')
    expect(readableTextOn('#fef3c7')).toBe('#09090b')
  })

  it('warns about the same pairs as the server, below WCAG AA', () => {
    expect(contrastWarnings(LIGHT)).toEqual([])
    const warnings = contrastWarnings({ ...LIGHT, button_bg: '#ffffff', button_text: '#eeeeee' })
    expect(warnings.map((w) => [w.foreground, w.background])).toEqual([['button_text', 'button_bg']])
    expect(warnings[0].ratio).toBeLessThan(4.5)
  })
})

describe('backgroundPatternStyle', () => {
  it('draws every curated pattern with the given color only', () => {
    for (const pattern of ['dots', 'grid', 'stripes', 'waves', 'checks', 'zigzag'] as const) {
      const style = backgroundPatternStyle(pattern, '#18181b')
      expect(style.backgroundImage).toContain('#18181b')
      expect(style.backgroundImage).not.toMatch(/url\(/)
      expect(style.backgroundSize).toMatch(/^\d+px \d+px$/)
    }
  })
})
