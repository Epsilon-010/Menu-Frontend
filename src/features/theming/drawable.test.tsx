import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Theme } from './api.ts'
import { DEFAULT_CARDS } from './cards.ts'
import { DEFAULT_LAYOUT, withDrawableLayout } from './layout.ts'
import { MenuHero } from './MenuHero.tsx'
import { DEFAULT_BRAND, DEFAULT_DARK_COLORS, DEFAULT_LIGHT_COLORS } from './normalize.ts'
import { ThemeScope } from './ThemeScope.tsx'
import { DEFAULT_TYPOGRAPHY, googleFontsUrl, typographyVariables } from './typography.ts'

function theme(changes: Record<string, unknown>): Theme {
  return {
    schema_version: 4,
    colors: DEFAULT_LIGHT_COLORS,
    brand: DEFAULT_BRAND,
    typography: DEFAULT_TYPOGRAPHY,
    layout: DEFAULT_LAYOUT,
    cards: DEFAULT_CARDS,
    ...changes,
  } as unknown as Theme
}

function renderMenu(raw: Theme): string {
  const drawable = withDrawableLayout(raw)
  return renderToStaticMarkup(
    <ThemeScope theme={drawable} imageUrls={{}}>
      <MenuHero theme={drawable} imageUrls={{}} businessName="Demo" />
    </ThemeScope>,
  )
}

describe('a theme the menu cannot draw as sent', () => {
  it('draws an unknown font id with the default font', () => {
    const raw = theme({ typography: { ...DEFAULT_TYPOGRAPHY, fonts: { ...DEFAULT_TYPOGRAPHY.fonts, heading: 'comic_sans' } } })
    expect(() => renderMenu(raw)).not.toThrow()
    const typography = withDrawableLayout(raw).typography
    expect(typography.fonts.heading).toBe('geist')
    expect(typographyVariables(typography)['--type-category-family']).toContain('"Geist"')
    expect(googleFontsUrl(typography)).toBeNull()
  })

  it('draws a missing text element with the default typography', () => {
    const elements: Partial<typeof DEFAULT_TYPOGRAPHY.elements> = { ...DEFAULT_TYPOGRAPHY.elements }
    delete elements.category
    const raw = theme({ typography: { ...DEFAULT_TYPOGRAPHY, elements } })
    expect(() => renderMenu(raw)).not.toThrow()
    expect(withDrawableLayout(raw).typography.elements.category).toEqual(DEFAULT_TYPOGRAPHY.elements.category)
  })

  it('draws a missing typography with the default typography', () => {
    const raw = theme({ typography: undefined })
    expect(() => renderMenu(raw)).not.toThrow()
    expect(withDrawableLayout(raw).typography).toEqual(DEFAULT_TYPOGRAPHY)
  })

  it('uses the default for odd weights, styles and out of range numbers', () => {
    const raw = theme({
      typography: {
        ...DEFAULT_TYPOGRAPHY,
        scale: 999,
        elements: {
          ...DEFAULT_TYPOGRAPHY.elements,
          price: { ...DEFAULT_TYPOGRAPHY.elements.price, weight: 'bold', style: 'oblique', size: 500, font: 'title' },
        },
      },
    })
    const typography = withDrawableLayout(raw).typography
    expect(typography.scale).toBe(DEFAULT_TYPOGRAPHY.scale)
    expect(typography.elements.price).toEqual(DEFAULT_TYPOGRAPHY.elements.price)
  })

  it('draws a missing gradient as no gradient', () => {
    const colors: Partial<typeof DEFAULT_LIGHT_COLORS> = { ...DEFAULT_LIGHT_COLORS }
    delete colors.gradient
    const raw = theme({ colors })
    expect(() => renderMenu(raw)).not.toThrow()
    expect(withDrawableLayout(raw).colors.gradient).toEqual(DEFAULT_LIGHT_COLORS.gradient)
  })

  it("replaces an odd color with the default of the theme's mode", () => {
    const raw = theme({ colors: { ...DEFAULT_DARK_COLORS, surface: 'red', primary: undefined } })
    const colors = withDrawableLayout(raw).colors
    expect(colors.surface).toBe(DEFAULT_DARK_COLORS.surface)
    expect(colors.primary).toBe(DEFAULT_DARK_COLORS.primary)
    expect(colors.text).toBe(DEFAULT_DARK_COLORS.text)
  })

  it('draws a missing or odd brand with the default brand', () => {
    expect(() => renderMenu(theme({ brand: undefined }))).not.toThrow()
    const brand = withDrawableLayout(
      theme({ brand: { ...DEFAULT_BRAND, name: 42, logo: { size: 'huge' }, banner: null, background: { kind: 'video' } } }),
    ).brand
    expect(brand).toEqual(DEFAULT_BRAND)
  })

  it('keeps a valid theme as it is', () => {
    const raw = theme({})
    expect(withDrawableLayout(raw)).toEqual(raw)
  })
})
