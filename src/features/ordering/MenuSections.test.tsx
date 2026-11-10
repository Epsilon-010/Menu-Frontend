import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { MenuSection } from '../theming/api.ts'
import { DEFAULT_CARDS } from '../theming/cards.ts'
import { DEFAULT_LAYOUT } from '../theming/layout.ts'
import { DEFAULT_SECTIONS } from '../theming/sections.ts'
import type { MenuCategory } from './api.ts'
import { MenuSections } from './MenuSections.tsx'

const CATEGORIES: MenuCategory[] = [
  {
    id: 'tacos',
    name: 'Tacos',
    items: [
      { id: 't1', name: 'Pastor', description: '', price_cents: 2500, image: null, badges: [], modifier_groups: [] },
      { id: 't2', name: 'Suadero', description: '', price_cents: 2200, image: null, badges: [], modifier_groups: [] },
    ],
  },
]

function render(sections: MenuSection[], extra: { selectedId?: string; onSelect?: (id: string) => void } = {}): string {
  return renderToStaticMarkup(
    <MenuSections
      sections={sections}
      hero={<p>HERO</p>}
      menu={<p>MENU</p>}
      categories={CATEGORIES}
      layout={DEFAULT_LAYOUT}
      cards={DEFAULT_CARDS}
      onAdd={() => Promise.resolve(null)}
      {...extra}
    />,
  )
}

const order = (html: string) => [...html.matchAll(/data-section="([a-z]+)"/g)].map((match) => match[1])

describe('the menu page by its sections', () => {
  it('draws the default page as before: the header, then the menu', () => {
    const html = render(DEFAULT_SECTIONS)
    expect(order(html)).toEqual(['hero', 'menu'])
    expect(html.indexOf('HERO')).toBeLessThan(html.indexOf('MENU'))
  })

  it('draws every section in the order the admin chose', () => {
    const html = render([
      { id: 'a', type: 'text', title: 'Promo del día', body: '2x1\nen tacos', align: 'center', style: 'highlight' },
      { id: 'b', type: 'divider' },
      { id: 'c', type: 'featured', title: 'Lo más pedido', item_ids: ['t2', 'gone', 't1'], view: 'grid' },
      ...DEFAULT_SECTIONS,
    ])
    expect(order(html)).toEqual(['text', 'divider', 'featured', 'hero', 'menu'])
    expect(html).toContain('Promo del día')
    expect(html).toContain('2x1\nen tacos')
    expect(html).toContain('Lo más pedido')
    // The picked products, in the admin's order, without the one no longer on the menu.
    expect(html.indexOf('Suadero')).toBeLessThan(html.indexOf('Pastor'))
  })

  it('leaves out an empty featured or text section on the menu, but marks it in the editor preview', () => {
    const empty: MenuSection[] = [
      { id: 'f', type: 'featured', title: 'Nada', item_ids: ['gone'], view: 'carousel' },
      { id: 't', type: 'text', title: '', body: '', align: 'left', style: 'plain' },
      DEFAULT_SECTIONS[1],
    ]
    expect(order(render(empty))).toEqual(['menu'])
    const preview = render(empty, { onSelect: () => {} })
    expect(order(preview)).toEqual(['featured', 'text', 'menu'])
    expect(preview).toContain('Elige los productos')
  })

  it('outlines the section picked in the editor preview', () => {
    const html = render(DEFAULT_SECTIONS, { selectedId: DEFAULT_SECTIONS[1].id, onSelect: () => {} })
    expect(html).toMatch(/data-section="menu"[^>]*data-selected="true"/)
    expect(html).not.toMatch(/data-section="hero"[^>]*data-selected="true"/)
  })
})
