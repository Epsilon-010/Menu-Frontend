import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ThemeLayout } from '../theming/api.ts'
import { DEFAULT_LAYOUT } from '../theming/layout.ts'
import type { MenuCategory } from './api.ts'
import { MenuBrowser } from './MenuBrowser.tsx'

const CATEGORIES: MenuCategory[] = [
  {
    id: 'tacos',
    name: 'Tacos',
    items: [
      { id: 't1', name: 'Pastor', description: 'With pineapple', price_cents: 2500, image: null },
      {
        id: 't2',
        name: 'Suadero',
        description: '',
        price_cents: 2200,
        image: { thumbnail_url: null, card_url: 'https://img.test/s.jpg' },
      },
    ],
  },
  { id: 'drinks', name: 'Drinks', items: [{ id: 'd1', name: 'Horchata', description: '', price_cents: 3000, image: null }] },
  { id: 'empty', name: 'Coming soon', items: [] },
]

function render(changes: Partial<ThemeLayout> = {}, categories = CATEGORIES): string {
  return renderToStaticMarkup(
    <MenuBrowser categories={categories} onAdd={() => Promise.resolve(null)} layout={{ ...DEFAULT_LAYOUT, ...changes }} />,
  )
}

function sections(html: string): string[] {
  return [...html.matchAll(/<section[^>]*id="category-([^"]+)"/g)].map((match) => match[1])
}

describe('the menu by its layout', () => {
  it('by default shows chips that jump to every section, in a two-column grid', () => {
    const html = render()
    expect(html).toContain('href="#category-tacos"')
    expect(html).toContain('href="#category-drinks"')
    expect(sections(html)).toEqual(['tacos', 'drinks'])
    expect(html).toContain('grid gap-4 @[39rem]:grid-cols-2')
    expect(html).toContain('sticky top-20')
    expect(html).not.toContain('Coming soon')
  })

  it('with sections shows the whole page under a bar of links', () => {
    const html = render({ navigation: 'sections' })
    expect(sections(html)).toEqual(['tacos', 'drinks'])
    expect(html).toContain('href="#category-drinks"')
    expect(html).not.toContain('<button type="button" aria-current')
  })

  it('with tabs or the sidebar shows one category at a time, the first one to start', () => {
    for (const navigation of ['tabs', 'sidebar'] as const) {
      const html = render({ navigation })
      expect(sections(html)).toEqual(['tacos'])
      expect(html).toMatch(/<button type="button" aria-current="true"[^>]*>Tacos<\/button>/)
      expect(html).toMatch(/<button type="button" class="[^"]*">Drinks<\/button>/)
    }
  })

  it('lays the products out as a grid, a list or a carousel', () => {
    expect(render({ columns: 1 })).toContain('class="grid gap-4 "')
    expect(render({ product_view: 'list' })).toContain('flex-row')
    const carousel = render({ product_view: 'carousel' })
    expect(carousel).toContain('role="region" aria-label="Tacos, swipe for more"')
    expect(carousel).toContain('snap-x')
  })

  it('applies the density and the category title style', () => {
    expect(render({ density: 'compact' })).toContain('grid gap-2')
    expect(render({ density: 'spacious' })).toContain('space-y-12')
    expect(render({ category_header: 'band' })).toContain('bg-brand px-4 py-2 text-brand-ink">Tacos</h2>')
    expect(render({ category_header: 'underline' })).toContain('border-b-2 border-accent pb-2 text-secondary">Tacos</h2>')
  })

  it('sticks its navigation to the very top when no fixed bar covers the page', () => {
    const html = renderToStaticMarkup(
      <MenuBrowser categories={CATEGORIES} onAdd={() => Promise.resolve(null)} belowFixedBar={false} />,
    )
    expect(html).toContain('sticky top-0')
  })

  it('says the menu is being prepared when no category has items', () => {
    expect(render({}, [CATEGORIES[2]])).toContain('The menu is being prepared')
  })
})
