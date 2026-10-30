import { describe, expect, it } from 'vitest'
import type { ThemeCards } from './api.ts'
import {
  badgeShapeClass,
  buttonShapeClass,
  cardImageClass,
  cardPaddingClass,
  cardShellClass,
  cardTemplate,
  DEFAULT_CARDS,
  descriptionClampClass,
  MAX_DESCRIPTION_LINES,
  normalizeCards,
} from './cards.ts'

function cards(changes: Partial<ThemeCards> = {}): ThemeCards {
  return { ...DEFAULT_CARDS, ...changes }
}

describe('product cards', () => {
  it('by default draw the card the menu had before: rounded, thin line border, no shadow, no motion', () => {
    expect(DEFAULT_CARDS).toEqual({
      template: 'vertical',
      image: { aspect: 'landscape', fit: 'cover', position: 'left' },
      radius: 'xl',
      shadow: 'none',
      border: { width: 'thin', color: 'border' },
      padding: 'comfortable',
      description_lines: 3,
      price_position: 'top',
      add_button: { style: 'both', shape: 'rounded' },
      hover: 'none',
      animation: 'none',
      overlay_opacity: 60,
      badge_shape: 'pill',
    })
    expect(cardShellClass(DEFAULT_CARDS)).toBe('rounded-2xl border border-line')
    expect(cardImageClass(DEFAULT_CARDS)).toBe('aspect-[4/3] object-cover')
    expect(cardPaddingClass(DEFAULT_CARDS)).toBe('p-4')
    expect(descriptionClampClass(3)).toBe('line-clamp-3')
  })

  it('maps every shape option to fixed classes', () => {
    const shell = cardShellClass(
      cards({ radius: 'none', shadow: 'lg', border: { width: 'thick', color: 'accent' }, hover: 'lift', animation: 'rise' }),
    )
    expect(shell).toContain('rounded-none')
    expect(shell).toContain('shadow-lg')
    expect(shell).toContain('border-2 border-accent')
    expect(shell).toContain('motion-safe:hover:-translate-y-1')
    expect(shell).toContain('motion-safe:animate-card-rise')
    expect(cardShellClass(cards({ border: { width: 'none', color: 'primary' } }))).not.toContain('border-brand')
    expect(cardShellClass(cards({ hover: 'grow', animation: 'fade' }))).toContain('motion-safe:hover:scale-[1.02]')
    expect(cardShellClass(cards({ animation: 'fade' }))).toContain('motion-safe:animate-card-fade')
    expect(cardImageClass(cards({ image: { aspect: 'wide', fit: 'contain', position: 'right' } }))).toBe(
      'aspect-video object-contain',
    )
    expect(cardPaddingClass(cards({ padding: 'spacious' }))).toBe('p-6')
    expect(badgeShapeClass('pill')).toBe('rounded-full')
    expect(badgeShapeClass('rounded')).toBe('rounded-lg')
    expect(buttonShapeClass('pill')).toBe('rounded-full!')
    expect(buttonShapeClass('square')).toBe('rounded-none!')
  })

  it('hides the description at zero lines and clamps it otherwise', () => {
    expect(descriptionClampClass(0)).toBeNull()
    expect(descriptionClampClass(1)).toBe('line-clamp-1')
    expect(descriptionClampClass(6)).toBe('line-clamp-6')
    for (let lines = 1; lines <= MAX_DESCRIPTION_LINES; lines++) {
      expect(descriptionClampClass(lines)).toBe(`line-clamp-${lines}`)
    }
  })

  it('draws list rows horizontally whatever the template, and the template elsewhere', () => {
    expect(cardTemplate('list', 'overlay')).toBe('horizontal')
    expect(cardTemplate('grid', 'overlay')).toBe('overlay')
    expect(cardTemplate('carousel', 'horizontal')).toBe('horizontal')
  })

  it('falls back to the default for anything missing or unknown, so an older server still draws', () => {
    expect(normalizeCards(undefined)).toEqual(DEFAULT_CARDS)
    expect(
      normalizeCards({
        template: 'minimal',
        image: { aspect: 'square', fit: 'zoom' },
        description_lines: 9,
        overlay_opacity: 75,
        add_button: 'text',
        hover: 'lift',
      }),
    ).toEqual({
      ...DEFAULT_CARDS,
      image: { ...DEFAULT_CARDS.image, aspect: 'square' },
      overlay_opacity: 75,
      hover: 'lift',
    })
  })
})
