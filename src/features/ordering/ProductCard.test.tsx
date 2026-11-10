import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { CardBlock, CardTemplate, ThemeCards } from '../theming/api.ts'
import { DEFAULT_CARDS } from '../theming/cards.ts'
import type { MenuItem } from './api.ts'
import { ProductCard } from './ProductCard.tsx'

const ITEM: MenuItem = {
  id: 'i1',
  name: 'Chilaquiles',
  description: 'Green salsa and cream',
  price_cents: 8900,
  image: { thumbnail_url: null, card_url: 'https://img.test/c.jpg' },
  badges: ['spicy'],
  modifier_groups: [],
}

// What each block leaves in the markup, to find where it was drawn.
const MARKS: Record<CardBlock, string> = {
  image: '<img',
  heading: '>Chilaquiles</h3>',
  description: '>Green salsa and cream</p>',
  badges: 'aria-label="Etiquetas"',
  add_button: 'Agregar</button>',
}

function render(blocks: CardBlock[], template: CardTemplate = 'vertical', changes: Partial<ThemeCards> = {}, item = ITEM): string {
  return renderToStaticMarkup(
    <ProductCard item={item} onAdd={() => Promise.resolve(null)} cards={{ ...DEFAULT_CARDS, ...changes, blocks }} template={template} />,
  )
}

/** The blocks in the order they appear in the markup. */
function drawnOrder(html: string, blocks: readonly CardBlock[] = DEFAULT_CARDS.blocks): CardBlock[] {
  return blocks
    .filter((block) => html.includes(MARKS[block]))
    .sort((a, b) => html.indexOf(MARKS[a]) - html.indexOf(MARKS[b]))
}

describe('the parts of a product card', () => {
  it('are drawn in the default order the card always had: image, badges, name with price, description and the add button', () => {
    const html = render(DEFAULT_CARDS.blocks)
    expect(drawnOrder(html)).toEqual(['image', 'badges', 'heading', 'description', 'add_button'])
    // The name and the description right below it stay together; the price sits beside the name.
    expect(html).toMatch(
      /<div class="space-y-1"><div class="flex items-start justify-between gap-4"><h3[^>]*>Chilaquiles<\/h3><p[^>]*>\$89.00<\/p><\/div><p/,
    )
  })

  it('follow the theme order, the image included in the vertical template', () => {
    const blocks: CardBlock[] = ['heading', 'badges', 'image', 'add_button', 'description']
    const html = render(blocks)
    expect(drawnOrder(html)).toEqual(blocks)
    // The image stays full width between the padded parts above and below it.
    expect(html).toMatch(/p-4"><div class="flex-1 space-y-2">.*<\/div><\/div><img [^>]*class="w-full/)
  })

  it('keep the image beside the text in the horizontal and overlay templates, ordering only the text', () => {
    const blocks: CardBlock[] = ['add_button', 'description', 'heading', 'badges', 'image']
    for (const template of ['horizontal', 'overlay'] as const) {
      const html = render(blocks, template)
      expect(html.indexOf('<img')).toBeLessThan(html.indexOf(MARKS.add_button))
      expect(drawnOrder(html, ['description', 'heading', 'badges', 'add_button'])).toEqual([
        'add_button',
        'description',
        'heading',
        'badges',
      ])
    }
  })

  it('put the price beside the add button wherever the button goes when the price is at the bottom', () => {
    const html = render(['add_button', 'image', 'heading', 'description', 'badges'], 'vertical', { price_position: 'bottom' })
    expect(html.indexOf('$89.00')).toBeLessThan(html.indexOf('<img'))
    expect(html.indexOf('$89.00')).toBeLessThan(html.indexOf(MARKS.add_button))
  })

  it('skip parts with nothing to show without moving the rest', () => {
    const item = { ...ITEM, description: '', badges: [], image: null }
    const html = render(['badges', 'add_button', 'description', 'image', 'heading'], 'vertical', {}, item)
    expect(drawnOrder(html)).toEqual(['add_button', 'heading'])
    expect(html).not.toContain('<img')
    // Without an image the card is one padded stretch, not two around a missing picture.
    expect(html.match(/flex-col gap-4 p-4/g)).toHaveLength(1)
  })
})
