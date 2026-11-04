import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { CategoryLayout, Theme, ThemeLayout } from './api.ts'
import { DEFAULT_CARDS } from './cards.ts'
import { CategoryLayoutList } from './CategoryLayoutControls.tsx'
import { DEFAULT_LAYOUT } from './layout.ts'
import { LayoutControls } from './LayoutControls.tsx'

const BREAKFAST = '0b6c1a52-7a0e-4f4e-9d77-0d2a8c6e1f11'
const DRINKS = '5e0f7c33-1b8d-4c2a-a1f9-3d6b2e9c4a22'
const CATEGORIES = [
  { id: BREAKFAST, name: 'Desayunos' },
  { id: DRINKS, name: 'Bebidas' },
]

function theme(layout: Partial<ThemeLayout> = {}): Theme {
  return { layout: { ...DEFAULT_LAYOUT, ...layout }, cards: DEFAULT_CARDS } as Theme
}

function render(categories: Record<string, CategoryLayout> = {}): string {
  return renderToStaticMarkup(<CategoryLayoutList theme={theme({ categories })} categories={CATEGORIES} onChange={() => undefined} />)
}

/** The markup of one category's group, by its name. */
function group(html: string, name: string): string {
  const found = html.split('<fieldset').find((markup) => markup.includes(`<legend class="sr-only">${name}</legend>`))
  if (found === undefined) throw new Error(`No group for ${name}`)
  return found
}

describe('designs per category', () => {
  it('list every category with its own design switched off until it has one', () => {
    const html = render()
    for (const name of ['Desayunos', 'Bebidas']) {
      const markup = group(html, name)
      expect(markup).toMatch(/role="switch" aria-checked="false"/)
      expect(markup).toContain('Diseño propio')
      expect(markup).not.toContain('>Vista</label>')
    }
  })

  it('show the view, columns and card template of a category with its own design', () => {
    const html = render({ [BREAKFAST]: { product_view: 'grid', columns: 3, card_template: 'overlay' } })
    const breakfast = group(html, 'Desayunos')
    expect(breakfast).toMatch(/role="switch" aria-checked="true"/)
    for (const label of ['Vista', 'Columnas', 'Plantilla de tarjeta']) expect(breakfast).toContain(`>${label}</label>`)
    expect(breakfast).toMatch(/data-state="on"[^>]*>3<\/button>/)
    expect(breakfast).toContain('Imagen completa')
    expect(group(html, 'Bebidas')).toMatch(/role="switch" aria-checked="false"/)
  })

  it('say the list always draws rows', () => {
    const html = render({ [DRINKS]: { product_view: 'list', columns: 1, card_template: 'vertical' } })
    expect(group(html, 'Bebidas')).toContain('La lista siempre muestra filas horizontales.')
  })

  it('invite to add categories when the menu has none', () => {
    const html = renderToStaticMarkup(<CategoryLayoutList theme={theme()} categories={[]} onChange={() => undefined} />)
    expect(html).toContain('Cuando tengas categorías con productos disponibles')
  })
})

describe('the layout controls', () => {
  it('list the parts of the menu header in the theme order and the per category section', () => {
    const html = renderToStaticMarkup(
      <LayoutControls theme={theme({ header_blocks: ['welcome', 'banner', 'name', 'tagline'] })} onChange={() => undefined} />,
    )
    expect(html).toContain('Orden del encabezado')
    const rows = [...html.matchAll(/aria-label="Arrastrar ([^"]+)"/g)].map((match) => match[1])
    expect(rows).toEqual(['Mensaje de bienvenida', 'Banner', 'Nombre y logo', 'Eslogan'])
    expect(html).toContain('Por categoría')
  })
})
