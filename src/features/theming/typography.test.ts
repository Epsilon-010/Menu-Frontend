import { describe, expect, it } from 'vitest'
import type { TextStyle, Typography } from './api.ts'
import { DEFAULT_TYPOGRAPHY, FONTS, fitToFont, googleFontsUrl, typographyVariables } from './typography.ts'

function withChanges(change: (typography: Typography) => void): Typography {
  const typography = structuredClone(DEFAULT_TYPOGRAPHY)
  change(typography)
  return typography
}

describe('the curated fonts', () => {
  it('has Geist plus the 12 chosen fonts with their real weights', () => {
    expect(Object.keys(FONTS).sort()).toEqual(
      [
        'bebas_neue', 'caveat', 'geist', 'inter', 'lato', 'lora', 'merriweather', 'montserrat', 'nunito', 'oswald',
        'pacifico', 'playfair_display', 'poppins',
      ],
    )
    expect(FONTS.bebas_neue).toMatchObject({ family: 'Bebas Neue', weights: [400], italic: false })
    expect(FONTS.lato.weights).toEqual([100, 300, 400, 700, 900])
    expect(FONTS.geist.italic).toBe(false)
  })
})

describe('typographyVariables', () => {
  it('writes each element as CSS variables, with the default menu look', () => {
    const variables = typographyVariables(DEFAULT_TYPOGRAPHY)
    expect(variables['--type-business-name-size']).toBe('30px')
    expect(variables['--type-business-name-weight']).toBe('600')
    expect(variables['--type-business-name-style']).toBe('normal')
    expect(variables['--type-business-name-line-height']).toBe('1.2')
    expect(variables['--type-business-name-letter-spacing']).toBe('-0.025em')
    expect(variables['--type-business-name-transform']).toBe('none')
    expect(variables['--type-business-name-align']).toBe('center')
    expect(variables['--type-description-size']).toBe('14px')
    expect(variables['--type-product-name-family']).toBe('"Geist", ui-sans-serif, system-ui, sans-serif')
    expect(variables['--type-body-family']).toBe('"Geist", ui-sans-serif, system-ui, sans-serif')
  })

  it('applies the role font of each element and the global scale', () => {
    const variables = typographyVariables(
      withChanges((typography) => {
        typography.scale = 120
        typography.fonts.heading = 'playfair_display'
        typography.fonts.price = 'caveat'
        typography.elements.business_name.size = 48
        typography.elements.price.font = 'price'
        typography.elements.category.transform = 'uppercase'
      }),
    )
    expect(variables['--type-business-name-size']).toBe('57.6px')
    expect(variables['--type-business-name-family']).toBe('"Playfair Display", ui-serif, Georgia, serif')
    expect(variables['--type-price-family']).toBe('"Caveat", cursive')
    expect(variables['--type-category-transform']).toBe('uppercase')
    expect(variables['--type-description-family']).toBe('"Geist", ui-sans-serif, system-ui, sans-serif')
  })
})

describe('googleFontsUrl', () => {
  it('loads nothing for the default theme: the app already loads Geist 400 to 700', () => {
    expect(googleFontsUrl(DEFAULT_TYPOGRAPHY)).toBeNull()
  })

  it('loads only the families, weights and italics that the elements use', () => {
    const url = googleFontsUrl(
      withChanges((typography) => {
        typography.fonts.heading = 'lora'
        typography.fonts.button = 'pacifico' // no element uses the button role below
        typography.elements.button.font = 'body'
        typography.elements.business_name.weight = 700
        typography.elements.product_name.style = 'italic'
        typography.elements.product_name.weight = 400
      }),
    )
    expect(url).toBe(
      'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,600;0,700;1,400&display=swap',
    )
  })

  it('asks Google only for Geist weights the app does not load and for upright-only families without ital', () => {
    const url = googleFontsUrl(
      withChanges((typography) => {
        typography.fonts.price = 'bebas_neue'
        typography.elements.price.weight = 400
        typography.elements.business_name.weight = 800
      }),
    )
    expect(url).toBe('https://fonts.googleapis.com/css2?family=Bebas+Neue:wght@400&family=Geist:wght@800&display=swap')
  })
})

describe('fitToFont', () => {
  const style: TextStyle = { ...DEFAULT_TYPOGRAPHY.elements.price, weight: 600, style: 'italic' }

  it('keeps what the font has and moves the rest to the closest it has', () => {
    expect(fitToFont(style, 'lora')).toEqual(style)
    expect(fitToFont(style, 'bebas_neue')).toMatchObject({ weight: 400, style: 'normal' })
    expect(fitToFont(style, 'lato')).toMatchObject({ weight: 700, style: 'italic' })
    expect(fitToFont({ ...style, weight: 100 }, 'oswald')).toMatchObject({ weight: 200, style: 'normal' })
  })
})
