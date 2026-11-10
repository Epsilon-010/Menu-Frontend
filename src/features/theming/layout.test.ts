import { describe, expect, it } from 'vitest'
import { DEFAULT_CARDS } from './cards.ts'
import {
  CART_STYLES,
  CATEGORY_HEADERS,
  DEFAULT_LAYOUT,
  DENSITIES,
  NAVIGATIONS,
  PRODUCT_VIEWS,
  cartPlacement,
  categoryArrangement,
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
      header_blocks: ['banner', 'name', 'tagline', 'welcome'],
      categories: {},
      sections: [
        { id: '00000000-0000-4000-8000-000000000001', type: 'hero' },
        { id: '00000000-0000-4000-8000-000000000002', type: 'menu' },
      ],
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

const BREAKFAST = '0b6c1a52-7a0e-4f4e-9d77-0d2a8c6e1f11'
const DRINKS = '5e0f7c33-1b8d-4c2a-a1f9-3d6b2e9c4a22'

describe('the order of the menu header', () => {
  it('is kept when it lists every block once', () => {
    const header_blocks = ['welcome', 'name', 'banner', 'tagline'] as const
    expect(normalizeLayout({ ...DEFAULT_LAYOUT, header_blocks }).header_blocks).toEqual(header_blocks)
  })

  it('falls back to the default order when missing or not exactly one of each block', () => {
    const fallback = ['banner', 'name', 'tagline', 'welcome']
    for (const header_blocks of [
      undefined,
      'banner',
      ['banner', 'name', 'tagline'],
      ['banner', 'name', 'tagline', 'tagline'],
      ['banner', 'name', 'tagline', 'logo'],
      ['banner', 'name', 'tagline', 'welcome', 'banner'],
    ]) {
      expect(normalizeLayout({ ...DEFAULT_LAYOUT, header_blocks }).header_blocks).toEqual(fallback)
    }
  })
})

describe('layouts per category', () => {
  const own = { product_view: 'list', columns: 1, card_template: 'horizontal' } as const

  it('are kept when complete and valid', () => {
    const categories = { [BREAKFAST]: own, [DRINKS]: { product_view: 'grid', columns: 4, card_template: 'overlay' } }
    expect(normalizeLayout({ ...DEFAULT_LAYOUT, categories }).categories).toEqual(categories)
  })

  it('drop any entry that is incomplete or unknown, and a missing or odd map becomes empty', () => {
    expect(normalizeLayout({ ...DEFAULT_LAYOUT, categories: undefined }).categories).toEqual({})
    expect(normalizeLayout({ ...DEFAULT_LAYOUT, categories: [own] }).categories).toEqual({})
    expect(normalizeLayout({ ...DEFAULT_LAYOUT, categories: 'grid' }).categories).toEqual({})
    const categories = {
      [BREAKFAST]: own,
      a: { product_view: 'masonry', columns: 1, card_template: 'horizontal' },
      b: { product_view: 'grid', columns: 5, card_template: 'vertical' },
      c: { product_view: 'grid', columns: 2, card_template: 'minimal' },
      d: { product_view: 'grid', columns: 2 },
      e: null,
    }
    expect(normalizeLayout({ ...DEFAULT_LAYOUT, categories }).categories).toEqual({ [BREAKFAST]: own })
    expect(normalizeLayout(JSON.parse(`{"categories": {"__proto__": ${JSON.stringify(own)}}}`)).categories).toEqual({})
  })

  it('give a category its own view, columns and template; any other category follows the general layout', () => {
    const layout = { ...DEFAULT_LAYOUT, categories: { [BREAKFAST]: own } }
    expect(categoryArrangement(layout, DEFAULT_CARDS, BREAKFAST)).toEqual({ product_view: 'list', columns: 1, template: 'horizontal' })
    expect(categoryArrangement(layout, DEFAULT_CARDS, DRINKS)).toEqual({ product_view: 'grid', columns: 2, template: 'vertical' })
    expect(categoryArrangement(layout, DEFAULT_CARDS, 'constructor')).toEqual({ product_view: 'grid', columns: 2, template: 'vertical' })
    // A list still draws horizontal rows, whatever the category's template.
    const list = { ...layout, categories: { [BREAKFAST]: { ...own, card_template: 'overlay' as const } } }
    expect(categoryArrangement(list, DEFAULT_CARDS, BREAKFAST).template).toBe('horizontal')
  })

  it('widen the page for a category of the menu with a four-column grid', () => {
    const layout = { ...DEFAULT_LAYOUT, categories: { [DRINKS]: { product_view: 'grid', columns: 4, card_template: 'vertical' } as const } }
    expect(menuWidthClass(layout, [BREAKFAST, DRINKS])).toBe('max-w-7xl')
    // A deleted category's layout changes nothing.
    expect(menuWidthClass(layout, [BREAKFAST])).toBe('max-w-5xl')
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
