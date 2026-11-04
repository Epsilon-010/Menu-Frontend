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

/** The markup of the control with that label: from its label to the next label. */
function control(html: string, label: string): string {
  const at = html.indexOf(`>${label}</label>`)
  if (at < 0) throw new Error(`No control labeled ${label}`)
  const end = html.indexOf('<label', at)
  return html.slice(at, end < 0 ? undefined : end)
}

/** The text a select list shows for its chosen option (the trigger's value). */
function chosen(html: string, label: string): string {
  const markup = control(html, label)
  const start = markup.indexOf('<button')
  const trigger = markup.slice(start, markup.indexOf('</button>', start))
  return trigger.replace(/<[^>]+>/g, '').trim()
}

const disabled = (markup: string) => markup.includes(' disabled=""')

describe('card controls', () => {
  it('offer every option group, showing the chosen template and description lines', () => {
    const html = render()
    const labels = ['Plantilla de tarjeta', 'Ajuste', 'Esquinas', 'Sombra', 'Borde', 'Espacio interior', 'Líneas de descripción', 'Precio']
    for (const label of [...labels, 'Contenido', 'Forma del botón', 'Al pasar el cursor', 'Al aparecer las tarjetas']) {
      expect(html).toContain(`>${label}</label>`)
    }
    expect(chosen(html, 'Plantilla de tarjeta')).toBe('Vertical: imagen arriba')
    expect(chosen(render({ template: 'overlay' }), 'Plantilla de tarjeta')).toBe('Imagen completa con el texto encima')
    expect(chosen(render({ description_lines: 0 }), 'Líneas de descripción')).toBe('Ocultar la descripción')
  })

  it('show a few short options as a segmented control with the chosen one on', () => {
    const side = control(render({ template: 'horizontal', image: { aspect: 'landscape', fit: 'cover', position: 'right' } }), 'Lado')
    expect(side).toContain('role="radiogroup"')
    for (const option of ['Izquierda', 'Derecha']) expect(side).toContain(`>${option}</button>`)
    expect(side).toMatch(/data-state="on"[^>]*>Derecha<\/button>/)
  })

  it('use a select list when the options would not fit side by side', () => {
    expect(control(render({ shadow: 'md' }), 'Sombra')).not.toContain('role="radiogroup"')
    expect(control(render(), 'Forma')).not.toContain('role="radiogroup"')
  })

  it('enable the image side only for horizontal cards and the darkening only for the overlay', () => {
    expect(disabled(control(render(), 'Lado'))).toBe(true)
    expect(disabled(control(render({ template: 'horizontal' }), 'Lado'))).toBe(false)
    expect(disabled(control(render({ template: 'horizontal' }), 'Forma'))).toBe(true)
    expect(disabled(control(render({}, { product_view: 'list' }), 'Lado'))).toBe(false)
    expect(render()).not.toContain('Oscurecer bajo el texto')
    expect(render({ template: 'overlay', overlay_opacity: 45 })).toContain('Oscurecer bajo el texto: 45%')
    // List rows are never overlays, so the darkening would change nothing there.
    expect(render({ template: 'overlay' }, { product_view: 'list' })).not.toContain('Oscurecer bajo el texto')
  })

  it('say the list view always draws rows, and disable the border color without a border', () => {
    expect(render({}, { product_view: 'list' })).toContain('La vista de lista siempre dibuja filas horizontales')
    expect(disabled(control(render({ border: { width: 'none', color: 'border' } }), 'Color del borde'))).toBe(true)
    expect(disabled(control(render(), 'Color del borde'))).toBe(false)
  })
})
