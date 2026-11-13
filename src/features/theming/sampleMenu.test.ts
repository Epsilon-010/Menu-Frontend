import { describe, expect, it } from 'vitest'
import type { MenuCategory, MenuItem } from '../ordering/api.ts'
import { MIN_OWN_PRODUCTS, previewMenu } from './sampleMenu.ts'

function item(index: number): MenuItem {
  return { id: `item-${index}`, name: `Product ${index}`, description: '', price_cents: 1000, image: null, badges: [], modifier_groups: [] }
}

function menuWith(count: number): MenuCategory[] {
  return [{ id: 'category-1', name: 'Own category', items: Array.from({ length: count }, (_, index) => item(index)) }]
}

describe('previewMenu', () => {
  it('shows sample products while the business has none', () => {
    const preview = previewMenu([])

    expect(preview.sample).toBe(true)
    expect(preview.categories.flatMap((category) => category.items).length).toBeGreaterThanOrEqual(MIN_OWN_PRODUCTS)
  })

  it('shows sample products while the business has only a few', () => {
    const preview = previewMenu(menuWith(MIN_OWN_PRODUCTS - 1))

    expect(preview.sample).toBe(true)
    expect(preview.categories.map((category) => category.name)).not.toContain('Own category')
  })

  it("shows the business's own products once it has enough", () => {
    const own = menuWith(MIN_OWN_PRODUCTS)

    expect(previewMenu(own)).toEqual({ categories: own, sample: false })
  })

  it('counts products across categories', () => {
    const own = [...menuWith(3), { id: 'category-2', name: 'More', items: [item(10), item(11), item(12)] }]

    expect(previewMenu(own).sample).toBe(false)
  })

  it('gives every sample product a picture, a price and a unique id, so each card design shows complete', () => {
    const items = previewMenu([]).categories.flatMap((category) => category.items)

    expect(new Set(items.map((sample) => sample.id)).size).toBe(items.length)
    for (const sample of items) {
      expect(sample.price_cents).toBeGreaterThan(0)
      expect(sample.description).not.toBe('')
      expect(sample.image?.card_url).toMatch(/^data:image\/svg\+xml/)
    }
  })
})
