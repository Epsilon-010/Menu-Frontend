import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { CatalogItem } from './api.ts'
import { ItemRow } from './ItemRow.tsx'

const done = () => Promise.resolve(null)
const ACTIONS = { update: done, move: done, uploadImage: done, removeImage: done, remove: done }

function render(item: Partial<CatalogItem> = {}): string {
  const pastor: CatalogItem = {
    id: 'i1',
    category_id: 'c1',
    name: 'Pastor',
    description: '',
    price_cents: 2500,
    is_available: true,
    image: null,
    badges: [],
    modifier_group_ids: [],
    position: 0,
    ...item,
  }
  return renderToStaticMarkup(
    <ItemRow item={pastor} categories={[]} modifierGroups={[]} isFirst isLast actions={ACTIONS} />,
  )
}

describe('catalog item row', () => {
  it('keeps edit and the image upload visible, the rest behind more actions', () => {
    const html = render()
    expect(html).toMatch(/<button[^>]*>.*Editar<\/button>/)
    expect(html).toContain('Subir imagen')
    expect(html).toContain('aria-label="Ocultar en las mesas"')
    expect(html).toContain('aria-label="Más acciones de Pastor"')
    expect(html).not.toContain('Eliminar producto')
  })
})
