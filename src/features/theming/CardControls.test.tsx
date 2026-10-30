import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Theme, ThemeCards, ThemeLayout } from './api.ts'
import { CardControls } from './CardControls.tsx'
import { DEFAULT_CARDS } from './cards.ts'
import { DEFAULT_LAYOUT } from './layout.ts'

function render(cards: Partial<ThemeCards> = {}, layout: Partial<ThemeLayout> = {}): string {
  const theme = { layout: { ...DEFAULT_LAYOUT, ...layout }, cards: { ...DEFAULT_CARDS, ...cards } } as Theme
  return renderToStaticMarkup(<CardControls theme={theme} onChange={() => undefined} />)
}

/** The opening <select> tag of the control with that label. */
function select(html: string, label: string): string {
  const at = html.indexOf(`>${label}</`)
  if (at < 0) throw new Error(`No control labeled ${label}`)
  const start = html.indexOf('<select', at)
  return html.slice(start, html.indexOf('>', start) + 1)
}

describe('card controls', () => {
  it('offer every option group, with the three templates', () => {
    const html = render()
    const labels = ['Card template', 'Fit', 'Corners', 'Shadow', 'Border', 'Inner spacing', 'Description lines', 'Price']
    for (const label of [...labels, 'Content', 'Button shape', 'On hover', 'When cards appear']) {
      expect(html).toContain(`>${label}</`)
    }
    expect(html).toContain('>Vertical: image on top</option>')
    expect(html).toContain('>Full image with the text over it</option>')
    expect(html).toContain('>Hide the description</option>')
  })

  it('enable the image side only for horizontal cards and the darkening only for the overlay', () => {
    expect(select(render(), 'Side')).toContain(' disabled=""')
    expect(select(render({ template: 'horizontal' }), 'Side')).not.toContain(' disabled=""')
    expect(select(render({ template: 'horizontal' }), 'Shape')).toContain(' disabled=""')
    expect(select(render({}, { product_view: 'list' }), 'Side')).not.toContain(' disabled=""')
    expect(render()).not.toContain('Darkening under the text')
    expect(render({ template: 'overlay', overlay_opacity: 45 })).toContain('Darkening under the text: 45%')
  })

  it('say the list view always draws rows, and disable the border color without a border', () => {
    expect(render({}, { product_view: 'list' })).toContain('The list view always draws horizontal rows')
    expect(select(render({ border: { width: 'none', color: 'border' } }), 'Border color')).toContain(' disabled=""')
    expect(select(render(), 'Border color')).not.toContain(' disabled=""')
  })
})
