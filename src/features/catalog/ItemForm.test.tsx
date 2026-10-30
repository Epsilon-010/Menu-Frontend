import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ItemForm, type ItemFormValues } from './ItemForm.tsx'

function render(initial?: ItemFormValues): string {
  return renderToStaticMarkup(
    <ItemForm initial={initial} submitLabel="Save" onSubmit={() => Promise.resolve(null)} onCancel={() => undefined} />,
  )
}

/** Whether the checkbox of that badge is ticked. */
function ticked(html: string, label: string): boolean {
  const match = html.match(new RegExp(`<input type="checkbox"([^>]*)/>${label}</label>`))
  if (match === null) throw new Error(`No checkbox for ${label}`)
  return match[1].includes('checked=""')
}

describe('item form', () => {
  it('offers every badge, none ticked for a new item', () => {
    const html = render()
    for (const label of ['New', 'Popular', 'Spicy', 'Vegan', 'Vegetarian', 'Gluten-free']) {
      expect(ticked(html, label)).toBe(false)
    }
  })

  it('ticks the badges the item already has', () => {
    const html = render({ name: 'Pastor', description: '', price_cents: 2500, badges: ['vegan', 'gluten_free'] })
    expect(ticked(html, 'Vegan')).toBe(true)
    expect(ticked(html, 'Gluten-free')).toBe(true)
    expect(ticked(html, 'Spicy')).toBe(false)
  })
})
