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
    <PageControls
      theme={theme}
      imageUrls={{ 'tenants/t/sections/a': 'https://img.test/a.jpg' }}
      onChange={() => {}}
      selectedId={selectedId}
      onSelect={() => {}}
      onOpen={() => {}}
      onUploadImage={() => Promise.resolve(null)}
    />,
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

  it('offers a picture section and lets the admin upload, change or remove its photo', () => {
    expect(render(DEFAULT_SECTIONS)).toContain('Una foto de tu local, un platillo o una promoción.')
    const empty: MenuSection = { id: 'i', type: 'image', image_id: null, caption: '' }
    const blank = render([empty, ...DEFAULT_SECTIONS], 'i')
    expect(blank).toContain('Subir foto')
    expect(blank).not.toContain('Quitar foto')
    const withPhoto = render([{ ...empty, image_id: 'tenants/t/sections/a' }, ...DEFAULT_SECTIONS], 'i')
    expect(withPhoto).toContain('src="https://img.test/a.jpg"')
    expect(withPhoto).toContain('Cambiar foto')
    expect(withPhoto).toContain('Quitar foto')
  })

  it('shows nothing to edit until a section is picked', () => {
    expect(render(DEFAULT_SECTIONS)).not.toContain('aria-label="Editar')
  })
})
