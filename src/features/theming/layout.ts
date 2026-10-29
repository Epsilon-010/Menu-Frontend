import type { CartStyle, CategoryHeader, Density, Navigation, ProductView, ThemeLayout } from './api.ts'

export const NAVIGATIONS: Navigation[] = ['chips', 'tabs', 'sidebar', 'sections']
export const PRODUCT_VIEWS: ProductView[] = ['grid', 'list', 'carousel']
export const DENSITIES: Density[] = ['compact', 'comfortable', 'spacious']
export const CATEGORY_HEADERS: CategoryHeader[] = ['plain', 'underline', 'band']
export const CART_STYLES: CartStyle[] = ['bar', 'panel', 'floating']
export const MIN_COLUMNS = 1
export const MAX_COLUMNS = 4

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
}

// Full class names (Tailwind only generates classes it sees written out). Measured on the menu's own width:
// phones always get one column, tablets up to three.
const GRID_COLUMNS: Record<number, string> = {
  1: '',
  2: '@2xl:grid-cols-2',
  3: '@xl:grid-cols-2 @3xl:grid-cols-3',
  4: '@xl:grid-cols-2 @3xl:grid-cols-3 @6xl:grid-cols-4',
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

/** Tabs and the sidebar show one category at a time; chips and sections show the whole menu on one page. */
export function showsOneCategory(navigation: Navigation): boolean {
  return navigation === 'tabs' || navigation === 'sidebar'
}

/** The category on screen: the chosen one while it still exists, otherwise the first. */
export function currentCategoryId(ids: string[], chosen: string | null): string | null {
  if (chosen !== null && ids.includes(chosen)) return chosen
  return ids[0] ?? null
}
