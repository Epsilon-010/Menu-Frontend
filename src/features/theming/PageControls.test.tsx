import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { MenuSection, Theme } from './api.ts'
import { DEFAULT_LAYOUT } from './layout.ts'
import { PageControls } from './PageControls.tsx'
import { DEFAULT_SECTIONS } from './sections.ts'

const TEXT: MenuSection = { id: 't', type: 'text', title: 'Promo del día', body: '2x1', align: 'center', style: 'highlight' }

function render(sections: MenuSection[], selectedId: string | null = null): string {
  const theme = { layout: { ...DEFAULT_LAYOUT, sections } } as unknown as Theme
  return renderToStaticMarkup(
    <PageControls theme={theme} onChange={() => {}} selectedId={selectedId} onSelect={() => {}} onOpen={() => {}} />,
  )
}

describe('the page panel', () => {
  it('lists the sections top to bottom, and only the menu cannot be removed', () => {
    const html = render([TEXT, ...DEFAULT_SECTIONS])
    expect(html.indexOf('Promo del día')).toBeLessThan(html.indexOf('Encabezado'))
    expect(html.indexOf('Encabezado')).toBeLessThan(html.indexOf('Tus categorías y productos.'))
    expect(html).toContain('aria-label="Quitar Texto"')
    expect(html).toContain('aria-label="Quitar Encabezado"')
    expect(html).not.toContain('aria-label="Quitar Menú"')
  })

  it('offers the header again only once it was removed', () => {
    expect(render(DEFAULT_SECTIONS)).not.toContain('<span class="block text-xs text-muted">Tu banner')
    expect(render([DEFAULT_SECTIONS[1]])).toContain('Tu banner, nombre, eslogan y bienvenida.')
  })

  it('shows few options for the selected text and keeps the rest under "Más opciones"', () => {
    const html = render([TEXT, ...DEFAULT_SECTIONS], 't')
    expect(html).toContain('aria-label="Editar Texto"')
    expect(html).toContain('Mensaje')
    expect(html).toContain('Más opciones')
    expect(html).toMatch(/<details[^>]*>(?:(?!<\/details>).)*Alineación/s)
  })

  it('shows nothing to edit until a section is picked', () => {
    expect(render(DEFAULT_SECTIONS)).not.toContain('aria-label="Editar')
  })
})
