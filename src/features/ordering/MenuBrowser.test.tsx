import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ThemeCards, ThemeLayout } from '../theming/api.ts'
import { DEFAULT_CARDS } from '../theming/cards.ts'
import { DEFAULT_LAYOUT } from '../theming/layout.ts'
import type { MenuCategory } from './api.ts'
import { MenuBrowser } from './MenuBrowser.tsx'

const CATEGORIES: MenuCategory[] = [
  {
    id: 'tacos',
    name: 'Tacos',
    items: [
      { id: 't1', name: 'Pastor', description: 'With pineapple', price_cents: 2500, image: null, badges: ['vegan', 'gluten_free'], modifier_groups: [] },
      {
        id: 't2',
        name: 'Suadero',
        description: '',
        price_cents: 2200,
        image: { thumbnail_url: null, card_url: 'https://img.test/s.jpg' },
        badges: [],
        modifier_groups: [],
      },
    ],
  },
  { id: 'drinks', name: 'Drinks', items: [{ id: 'd1', name: 'Horchata', description: '', price_cents: 3000, image: null, badges: [], modifier_groups: [] }] },
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

function renderCards(changes: Partial<ThemeCards> = {}, layout: Partial<ThemeLayout> = {}): string {
  return renderToStaticMarkup(
    <MenuBrowser
      categories={CATEGORIES.slice(0, 1)}
      onAdd={() => Promise.resolve(null)}
      layout={{ ...DEFAULT_LAYOUT, ...layout }}
      cards={{ ...DEFAULT_CARDS, ...changes }}
    />,
  )
}

/** The markup of one product card, by the product's name. */
function card(html: string, name: string): string {
  const cards = html.split('<article').slice(1)
  const found = cards.find((markup) => markup.includes(`>${name}</h3>`))
  if (found === undefined) throw new Error(`No card for ${name}`)
  return found
}

describe('the product cards by the theme', () => {
  it('by default look like before: image on top, three description lines, an "Add" button with its icon', () => {
    const html = renderCards()
    expect(card(html, 'Pastor')).toContain('rounded-2xl border border-line')
    expect(card(html, 'Pastor')).toContain('line-clamp-3')
    expect(card(html, 'Suadero')).toMatch(/<img src="https:\/\/img.test\/s.jpg"[^>]*class="[^"]*aspect-\[4\/3\] object-cover/)
    expect(card(html, 'Pastor')).toMatch(/<svg[^>]*>.*<\/svg>Add<\/button>/)
    expect(card(html, 'Pastor')).not.toContain('<img')
  })

  it('shows each product badges with their names in the theme shape', () => {
    const pastor = card(renderCards(), 'Pastor')
    expect(pastor).toContain('aria-label="Badges"')
    expect(pastor).toMatch(/rounded-full[^"]*bg-badge[^"]*text-badge-ink[^"]*">Vegan<\/li>/)
    expect(pastor).toContain('>Gluten-free</li>')
    expect(card(renderCards({ badge_shape: 'rounded' }), 'Pastor')).toMatch(/rounded-lg[^"]*bg-badge/)
    expect(card(renderCards(), 'Suadero')).not.toContain('aria-label="Badges"')
  })

  it('draws the overlay template with the text over a scrim on the image, and a plain card without image', () => {
    const html = renderCards({ template: 'overlay', overlay_opacity: 70 })
    const suadero = card(html, 'Suadero')
    expect(suadero).toContain('style="opacity:0.7"')
    expect(suadero).toContain('text-white')
    // The text wraps inside the card's width instead of widening it.
    expect(suadero).toContain('grid-cols-[minmax(0,1fr)]')
    const pastor = card(html, 'Pastor')
    expect(pastor).not.toContain('opacity:')
    expect(pastor).not.toContain('text-white')
  })

  it('puts the image beside the text in the horizontal template, on the side the theme says', () => {
    expect(card(renderCards({ template: 'horizontal' }), 'Suadero')).toContain('flex-row ')
    const right = renderCards({ template: 'horizontal', image: { aspect: 'square', fit: 'contain', position: 'right' } })
    expect(card(right, 'Suadero')).toContain('flex-row-reverse')
    expect(card(right, 'Suadero')).toContain('object-contain')
  })

  it('draws list rows horizontally whatever the template', () => {
    const html = renderCards({ template: 'overlay' }, { product_view: 'list' })
    expect(card(html, 'Suadero')).toContain('flex-row ')
    expect(card(html, 'Suadero')).not.toContain('opacity:')
  })

  it('hides the description at zero lines and moves the price next to the button at the bottom', () => {
    expect(renderCards({ description_lines: 0 })).not.toContain('With pineapple')
    const bottom = card(renderCards({ price_position: 'bottom' }), 'Pastor')
    expect(bottom.indexOf('With pineapple')).toBeLessThan(bottom.indexOf('$25.00'))
    const top = card(renderCards(), 'Pastor')
    expect(top.indexOf('$25.00')).toBeLessThan(top.indexOf('With pineapple'))
  })

  it('draws the add button as text, icon or both, in the theme shape', () => {
    const icon = card(renderCards({ add_button: { style: 'icon', shape: 'pill' } }), 'Pastor')
    expect(icon).toContain('aria-label="Add Pastor"')
    expect(icon).not.toContain('Add</button>')
    expect(icon).toContain('rounded-full')
    const text = card(renderCards({ add_button: { style: 'text', shape: 'square' } }), 'Pastor')
    expect(text).toMatch(/rounded-none[^"]*">Add<\/button>/)
    expect(text).not.toContain('<svg')
  })

  it('applies padding, shadow, hover and the entrance animation only where motion is welcome', () => {
    const pastor = card(renderCards({ padding: 'compact', shadow: 'md', hover: 'grow', animation: 'fade' }), 'Pastor')
    expect(pastor).toContain('p-3')
    expect(pastor).toContain('shadow-md')
    expect(pastor).toContain('motion-safe:hover:scale-[1.02]')
    expect(pastor).toContain('motion-safe:animate-card-fade')
  })
})
