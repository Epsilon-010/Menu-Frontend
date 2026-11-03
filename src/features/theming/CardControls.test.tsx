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
    const labels = ['Plantilla de tarjeta', 'Ajuste', 'Esquinas', 'Sombra', 'Borde', 'Espacio interior', 'Líneas de descripción', 'Precio']
    for (const label of [...labels, 'Contenido', 'Forma del botón', 'Al pasar el cursor', 'Al aparecer las tarjetas']) {
      expect(html).toContain(`>${label}</`)
    }
    expect(html).toContain('>Vertical: imagen arriba</option>')
    expect(html).toContain('>Imagen completa con el texto encima</option>')
    expect(html).toContain('>Ocultar la descripción</option>')
  })

  it('enable the image side only for horizontal cards and the darkening only for the overlay', () => {
    expect(select(render(), 'Lado')).toContain(' disabled=""')
    expect(select(render({ template: 'horizontal' }), 'Lado')).not.toContain(' disabled=""')
    expect(select(render({ template: 'horizontal' }), 'Forma')).toContain(' disabled=""')
    expect(select(render({}, { product_view: 'list' }), 'Lado')).not.toContain(' disabled=""')
    expect(render()).not.toContain('Oscurecer bajo el texto')
    expect(render({ template: 'overlay', overlay_opacity: 45 })).toContain('Oscurecer bajo el texto: 45%')
    // List rows are never overlays, so the darkening would change nothing there.
    expect(render({ template: 'overlay' }, { product_view: 'list' })).not.toContain('Oscurecer bajo el texto')
  })

  it('say the list view always draws rows, and disable the border color without a border', () => {
    expect(render({}, { product_view: 'list' })).toContain('La vista de lista siempre dibuja filas horizontales')
    expect(select(render({ border: { width: 'none', color: 'border' } }), 'Color del borde')).toContain(' disabled=""')
    expect(select(render(), 'Color del borde')).not.toContain(' disabled=""')
  })
})
