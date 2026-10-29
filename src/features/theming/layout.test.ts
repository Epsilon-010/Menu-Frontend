import { describe, expect, it } from 'vitest'
import {
  CART_STYLES,
  CATEGORY_HEADERS,
  DEFAULT_LAYOUT,
  DENSITIES,
  NAVIGATIONS,
  PRODUCT_VIEWS,
  cartPlacement,
  currentCategoryId,
  densitySpacing,
  gridColumnsClass,
  menuWidthClass,
  normalizeLayout,
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

describe('wide grids beside the cart panel', () => {
  it('reach three columns in the ~630px menu column large screens leave beside the cart bar', () => {
    expect(gridColumnsClass(3)).toBe('@[37rem]:grid-cols-3')
  })

  it('reach four columns once the menu page widens for them', () => {
    expect(gridColumnsClass(4)).toBe('@[37rem]:grid-cols-3 @[50rem]:grid-cols-4')
    expect(menuWidthClass({ ...DEFAULT_LAYOUT, columns: 4 })).toBe('max-w-7xl')
    expect(menuWidthClass({ ...DEFAULT_LAYOUT, columns: 4, product_view: 'list' })).toBe('max-w-5xl')
    expect(menuWidthClass({ ...DEFAULT_LAYOUT, columns: 3 })).toBe('max-w-5xl')
    expect(menuWidthClass(DEFAULT_LAYOUT)).toBe('max-w-5xl')
  })
})

describe('the cart', () => {
  it('is always reachable: the compact button shows exactly where the side panel does not', () => {
    for (const style of CART_STYLES) {
      const { aside, compact } = cartPlacement(style)
      if (style === 'floating') {
        expect(aside).toBe('hidden')
        expect(compact).toBe('')
      } else {
        const breakpoint = aside.replace('hidden ', '').replace(':block', '')
        expect(compact).toBe(`${breakpoint}:hidden`)
      }
    }
    expect(cartPlacement('bar').aside).toBe('hidden lg:block')
    expect(cartPlacement('panel').aside).toBe('hidden md:block')
  })
})

describe('a layout from the server', () => {
  it('is kept as it is when valid', () => {
    const layout = { ...DEFAULT_LAYOUT, navigation: 'tabs', columns: 4, cart: 'floating', show_banner: false } as const
    expect(normalizeLayout(layout)).toEqual(layout)
  })

  it('falls back to the default for a missing layout or any unknown value, so the menu never breaks', () => {
    expect(normalizeLayout(undefined)).toEqual(DEFAULT_LAYOUT)
    expect(normalizeLayout(null)).toEqual(DEFAULT_LAYOUT)
    expect(
      normalizeLayout({
        navigation: 'dropdown',
        product_view: 'masonry',
        columns: 9,
        density: 'tight',
        sticky_header: 'yes',
        category_header: 'image',
        show_banner: 1,
        cart: 'drawer',
      }),
    ).toEqual(DEFAULT_LAYOUT)
    expect(normalizeLayout({ navigation: 'sidebar' })).toEqual({ ...DEFAULT_LAYOUT, navigation: 'sidebar' })
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
