import { describe, expect, it } from 'vitest'
import {
  CART_STYLES,
  CATEGORY_HEADERS,
  DEFAULT_LAYOUT,
  DENSITIES,
  NAVIGATIONS,
  PRODUCT_VIEWS,
  currentCategoryId,
  densitySpacing,
  gridColumnsClass,
  showsOneCategory,
} from './layout.ts'

describe('the layout options', () => {
  it('are the ones the server accepts', () => {
    expect(NAVIGATIONS).toEqual(['chips', 'tabs', 'sidebar', 'sections'])
    expect(PRODUCT_VIEWS).toEqual(['grid', 'list', 'carousel'])
    expect(DENSITIES).toEqual(['compact', 'comfortable', 'spacious'])
    expect(CATEGORY_HEADERS).toEqual(['plain', 'underline', 'band'])
    expect(CART_STYLES).toEqual(['bar', 'panel', 'floating'])
  })

  it('default to the menu as it was before the layout could be customized', () => {
    expect(DEFAULT_LAYOUT).toEqual({
      navigation: 'chips',
      product_view: 'grid',
      columns: 2,
      density: 'comfortable',
      sticky_header: true,
      category_header: 'plain',
      show_banner: true,
      show_tagline: true,
      show_welcome: true,
      cart: 'bar',
    })
    // Two columns from a 624px menu: a 672px page minus its 48px padding, as before the layout existed.
    expect(gridColumnsClass(2)).toBe('@[39rem]:grid-cols-2')
    expect(densitySpacing('comfortable')).toEqual({ sections: 'space-y-8', items: 'gap-4' })
  })
})

describe('grid columns', () => {
  it('reach the chosen number on wide screens and stay readable on phones', () => {
    expect(gridColumnsClass(1)).toBe('')
    for (const columns of [1, 2, 3, 4]) {
      const classes = gridColumnsClass(columns).split(' ').filter(Boolean)
      // Phones always get one column (no class without a breakpoint).
      expect(classes.every((name) => name.startsWith('@'))).toBe(true)
      if (columns > 1) expect(classes.at(-1)).toMatch(new RegExp(`grid-cols-${columns}$`))
    }
  })
})

describe('density', () => {
  it('goes from tight to roomy', () => {
    expect(densitySpacing('compact')).toEqual({ sections: 'space-y-6', items: 'gap-2' })
    expect(densitySpacing('spacious')).toEqual({ sections: 'space-y-12', items: 'gap-6' })
  })
})

describe('one category at a time', () => {
  it('is how tabs and the sidebar show the menu; chips and sections show it all', () => {
    expect(NAVIGATIONS.filter(showsOneCategory)).toEqual(['tabs', 'sidebar'])
  })

  it('shows the chosen category, or the first one when it is gone', () => {
    expect(currentCategoryId(['a', 'b'], 'b')).toBe('b')
    expect(currentCategoryId(['a', 'b'], null)).toBe('a')
    expect(currentCategoryId(['a', 'b'], 'removed')).toBe('a')
    expect(currentCategoryId([], 'a')).toBeNull()
  })
})
