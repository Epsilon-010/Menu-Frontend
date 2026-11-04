import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { ModifierGroup } from '../modifiers/api.ts'
import { ItemForm, type ItemFormValues } from './ItemForm.tsx'

const SIZE: ModifierGroup = {
  id: 'g1',
  name: 'Size',
  min_select: 1,
  max_select: 1,
  options: [{ id: 'o1', name: 'Small', price_cents: 0, is_available: true }],
}
const SALSAS: ModifierGroup = {
  id: 'g2',
  name: 'Salsas',
  min_select: 0,
  max_select: 3,
  options: [{ id: 'o2', name: 'Verde', price_cents: 0, is_available: true }],
}

function render(initial?: ItemFormValues, modifierGroups: ModifierGroup[] | null = []): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <ItemForm
        initial={initial}
        modifierGroups={modifierGroups}
        submitLabel="Save"
        onSubmit={() => Promise.resolve(null)}
        onCancel={() => undefined}
      />
    </MemoryRouter>,
  )
}

/** Whether the checkbox with that label is ticked. */
function ticked(html: string, label: string): boolean {
  const match = html.match(new RegExp(`<input type="checkbox"([^>]*)/>${label}</label>`))
  if (match === null) throw new Error(`No checkbox for ${label}`)
  return match[1].includes('checked=""')
}

const PASTOR: ItemFormValues = { name: 'Pastor', description: '', price_cents: 2500, badges: [], modifier_group_ids: [] }

describe('item form', () => {
  it('offers every badge, none ticked for a new item', () => {
    const html = render()
    for (const label of ['Nuevo', 'Popular', 'Picante', 'Vegano', 'Vegetariano', 'Sin gluten']) {
      expect(ticked(html, label)).toBe(false)
    }
  })

  it('ticks the badges the item already has', () => {
    const html = render({ ...PASTOR, badges: ['vegan', 'gluten_free'] })
    expect(ticked(html, 'Vegano')).toBe(true)
    expect(ticked(html, 'Sin gluten')).toBe(true)
    expect(ticked(html, 'Picante')).toBe(false)
  })

  it('still shows the badges as before when the library has groups', () => {
    const html = render({ ...PASTOR, badges: ['spicy'] }, [SALSAS, SIZE])
    expect(ticked(html, 'Picante')).toBe(true)
    expect(ticked(html, 'Nuevo')).toBe(false)
  })
})

describe('modifier group picker', () => {
  it('lists the library in its order with the rule of each group, ticking the groups of the item', () => {
    const html = render({ ...PASTOR, modifier_group_ids: ['g1'] }, [SALSAS, SIZE])
    expect(html).toContain('Grupos de opciones (opcional)')
    expect(ticked(html, 'Salsas<span[^>]*>Opcional · hasta 3</span>')).toBe(false)
    expect(ticked(html, 'Size<span[^>]*>Obligatorio · elige 1</span>')).toBe(true)
    expect(html.indexOf('Salsas')).toBeLessThan(html.indexOf('Size'))
  })

  it('points to the modifiers page when the library is empty', () => {
    const html = render(PASTOR, [])
    expect(html).toMatch(/<a[^>]*href="\/admin\/modifiers"[^>]*>/)
    expect(html).not.toContain('type="checkbox" value="g')
  })

  it('explains what groups are for and links to the modifiers page when the library has groups', () => {
    const html = render(PASTOR, [SIZE])
    expect(html).toMatch(/<a[^>]*href="\/admin\/modifiers"[^>]*>Crea grupos en Opciones y extras<\/a>/)
  })

  it('shows only the empty-library link when there are no groups', () => {
    const html = render(PASTOR, [])
    expect(html).not.toContain('Crea grupos en Opciones y extras')
    expect(html.match(/href="\/admin\/modifiers"/g)).toHaveLength(1)
  })

  it('says the groups could not load and keeps those of the item when the library is missing', () => {
    const html = render({ ...PASTOR, modifier_group_ids: ['g1'] }, null)
    expect(html).toContain('No se pudieron cargar los grupos de opciones. Al guardar, el producto conserva los grupos que ya tiene.')
  })
})
