import { permutationOr } from './blocks.ts'
import { CARD_TEMPLATES, cardTemplate, normalizeCards } from './cards.ts'
import { normalizeBrand, normalizeColors } from './normalize.ts'
import { normalizeTypography } from './typography.ts'
import type {
  CardTemplate,
  CartStyle,
  CategoryHeader,
  CategoryLayout,
  Density,
  HeaderBlock,
  Navigation,
  ProductView,
  Theme,
  ThemeCards,
  ThemeLayout,
} from './api.ts'

export const NAVIGATIONS: Navigation[] = ['chips', 'tabs', 'sidebar', 'sections']
export const PRODUCT_VIEWS: ProductView[] = ['grid', 'list', 'carousel']
export const DENSITIES: Density[] = ['compact', 'comfortable', 'spacious']
export const CATEGORY_HEADERS: CategoryHeader[] = ['plain', 'underline', 'band']
export const CART_STYLES: CartStyle[] = ['bar', 'panel', 'floating']
export const MIN_COLUMNS = 1
export const MAX_COLUMNS = 4
/** Every header block, in the default order. */
export const HEADER_BLOCKS: HeaderBlock[] = ['banner', 'name', 'tagline', 'welcome']
/** The server keeps at most this many per-category layouts. */
export const MAX_CATEGORY_LAYOUTS = 100

/** The arrangement the menu had before the layout could be customized (the server's default too). */
export const DEFAULT_LAYOUT: ThemeLayout = {
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
  header_blocks: HEADER_BLOCKS,
  categories: {},
}

// Full class names (Tailwind only generates classes it sees written out). Measured on the menu's own width (beside
// the cart panel it is narrower than the page); phones always get one column. Two columns start at a 39rem (624px)
// menu, where they started before the layout existed (a 672px page minus its padding). Three start at 37rem, so they
// fit the ~630px column large screens leave beside the cart bar (scrollbar included), and four need a 50rem menu (see
// `menuWidthClass`): cards stay at least ~185px wide.
const GRID_COLUMNS: Record<number, string> = {
  1: '',
  2: '@[39rem]:grid-cols-2',
  3: '@[37rem]:grid-cols-3',
  4: '@[37rem]:grid-cols-3 @[50rem]:grid-cols-4',
}

export function gridColumnsClass(columns: number): string {
  return GRID_COLUMNS[columns] ?? GRID_COLUMNS[DEFAULT_LAYOUT.columns]
}

const DENSITY: Record<Density, { sections: string; items: string }> = {
  compact: { sections: 'space-y-6', items: 'gap-2' },
  comfortable: { sections: 'space-y-8', items: 'gap-4' },
  spacious: { sections: 'space-y-12', items: 'gap-6' },
}

/** Space between category sections and between the products of one. */
export function densitySpacing(density: Density): { sections: string; items: string } {
  return DENSITY[density]
}

/** The category's own layout, or null when it follows the general one. */
export function categoryLayout(layout: ThemeLayout, categoryId: string): CategoryLayout | null {
  return Object.hasOwn(layout.categories, categoryId) ? layout.categories[categoryId] : null
}

/** How one category shows its products: its own layout when it has one, otherwise the general layout and cards. */
export function categoryArrangement(
  layout: ThemeLayout,
  cards: ThemeCards,
  categoryId: string,
): { product_view: ProductView; columns: number; template: CardTemplate } {
  const own = categoryLayout(layout, categoryId)
  const product_view = own?.product_view ?? layout.product_view
  return {
    product_view,
    columns: own?.columns ?? layout.columns,
    template: cardTemplate(product_view, own?.card_template ?? cards.template),
  }
}

const fourColumns = (view: { product_view: ProductView; columns: number }) => view.product_view === 'grid' && view.columns === 4

/**
 * The menu page widens for a four-column grid (general, or of one of the categories on the menu), so the column
 * beside the cart panel fits four cards.
 */
export function menuWidthClass(layout: ThemeLayout, categoryIds: readonly string[] = []): string {
  const own = categoryIds.map((id) => categoryLayout(layout, id)).filter((entry) => entry !== null)
  return fourColumns(layout) || own.some(fourColumns) ? 'max-w-7xl' : 'max-w-5xl'
}

export interface CartPlacement {
  grid: string
  main: string
  aside: string
  /** The bottom bar or corner button, and the sheet it opens: shown wherever the side panel is not. */
  compact: string
  notice: string
}

/**
 * Where the table order lives. The side panel shows from large screens (bar) or tablets (panel); below it a bottom
 * bar opens the full order. Floating: a button in the corner at every size, and the menu gets the whole width.
 */
const CART_PLACEMENT: Record<CartStyle, CartPlacement> = {
  bar: { grid: 'lg:grid-cols-3 lg:pb-0', main: 'lg:col-span-2', aside: 'hidden lg:block', compact: 'lg:hidden', notice: 'lg:bottom-8' },
  panel: { grid: 'md:grid-cols-3 md:pb-0', main: 'md:col-span-2', aside: 'hidden md:block', compact: 'md:hidden', notice: 'md:bottom-8' },
  floating: { grid: '', main: '', aside: 'hidden', compact: '', notice: '' },
}

export function cartPlacement(style: CartStyle): CartPlacement {
  return CART_PLACEMENT[style]
}

/** Tabs and the sidebar show one category at a time; chips and sections show the whole menu on one page. */
export function showsOneCategory(navigation: Navigation): boolean {
  return navigation === 'tabs' || navigation === 'sidebar'
}

function oneOf<T extends string>(value: unknown, options: T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function isColumns(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= MIN_COLUMNS && (value as number) <= MAX_COLUMNS
}

/** Only complete, valid per-category layouts; anything else is dropped so that category uses the general layout. */
function normalizeCategories(raw: unknown): Record<string, CategoryLayout> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  const categories: Record<string, CategoryLayout> = {}
  for (const [id, entry] of Object.entries(raw).slice(0, MAX_CATEGORY_LAYOUTS)) {
    // `__proto__` would replace the object's prototype instead of adding a key; no category has that id.
    if (id === '__proto__' || typeof entry !== 'object' || entry === null) continue
    const { product_view, columns, card_template } = entry as Record<string, unknown>
    if (!PRODUCT_VIEWS.includes(product_view as ProductView) || !isColumns(columns)) continue
    if (!CARD_TEMPLATES.includes(card_template as CardTemplate)) continue
    categories[id] = { product_view: product_view as ProductView, columns, card_template: card_template as CardTemplate }
  }
  return categories
}

/**
 * The layout as the menu can draw it: any missing or unknown value (a server still on an older theme version while
 * a deploy rolls out) falls back to the default instead of breaking the page.
 */
export function normalizeLayout(raw: unknown): ThemeLayout {
  const value = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Record<keyof ThemeLayout, unknown>>
  const d = DEFAULT_LAYOUT
  const columns = value.columns
  return {
    navigation: oneOf(value.navigation, NAVIGATIONS, d.navigation),
    product_view: oneOf(value.product_view, PRODUCT_VIEWS, d.product_view),
    columns: isColumns(columns) ? columns : d.columns,
    density: oneOf(value.density, DENSITIES, d.density),
    sticky_header: flag(value.sticky_header, d.sticky_header),
    category_header: oneOf(value.category_header, CATEGORY_HEADERS, d.category_header),
    show_banner: flag(value.show_banner, d.show_banner),
    show_tagline: flag(value.show_tagline, d.show_tagline),
    show_welcome: flag(value.show_welcome, d.show_welcome),
    cart: oneOf(value.cart, CART_STYLES, d.cart),
    header_blocks: permutationOr(value.header_blocks, HEADER_BLOCKS),
    categories: normalizeCategories(value.categories),
  }
}

/**
 * The theme as the menu can always draw it: colors, brand, typography, layout and cards each fall back to their
 * defaults where a value is missing or unknown (see `normalizeColors`, `normalizeBrand`, `normalizeTypography`,
 * `normalizeLayout` and `normalizeCards`).
 */
export function withDrawableLayout<T extends Theme>(theme: T): T {
  return {
    ...theme,
    colors: normalizeColors(theme.colors),
    brand: normalizeBrand(theme.brand),
    typography: normalizeTypography(theme.typography),
    layout: normalizeLayout(theme.layout),
    cards: normalizeCards(theme.cards),
  }
}

/** The category on screen: the chosen one while it still exists, otherwise the first. */
export function currentCategoryId(ids: string[], chosen: string | null): string | null {
  if (chosen !== null && ids.includes(chosen)) return chosen
  return ids[0] ?? null
}
