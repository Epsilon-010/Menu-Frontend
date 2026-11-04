import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ModifierGroup } from './api.ts'
import { GroupEditor } from './GroupEditor.tsx'
import { GroupRow } from './GroupRow.tsx'

const SIZE: ModifierGroup = {
  id: 'g1',
  name: 'Size',
  min_select: 1,
  max_select: 2,
  options: [
    { id: 'o1', name: 'Small', price_cents: 0, is_available: true },
    { id: 'o2', name: 'Large', price_cents: 1250, is_available: false },
  ],
}

const done = () => Promise.resolve(null)

describe('modifier group row', () => {
  it('shows the rule and every option with its extra price, marking sold out ones', () => {
    const html = renderToStaticMarkup(<GroupRow group={SIZE} actions={{ update: done, remove: done }} />)
    expect(html).toContain('Elige de 1 a 2')
    expect(html).toMatch(/Small<\/li>/)
    expect(html).toMatch(/Large<span class="font-mono"> \+\$12\.50<\/span><span class="sr-only"> \(agotado\)<\/span>/)
  })
})

describe('modifier group editor', () => {
  it('fills the saved group in order with its prices and the rule guests see', () => {
    const html = renderToStaticMarkup(<GroupEditor initial={SIZE} submitLabel="Save changes" onSubmit={done} onCancel={() => undefined} />)
    expect(html).toContain('Los comensales ven: <span class="font-medium text-ink">Elige de 1 a 2</span>')
    expect(html.indexOf('value="Small"')).toBeLessThan(html.indexOf('value="Large"'))
    expect(html).toContain('value="12.50"')
  })

  it('shows each option availability as a switch', () => {
    const html = renderToStaticMarkup(<GroupEditor initial={SIZE} submitLabel="Save changes" onSubmit={done} onCancel={() => undefined} />)
    expect(html).toMatch(/role="switch" aria-checked="true"[^>]*aria-label="Opción 1 disponible"/)
    expect(html).toMatch(/role="switch" aria-checked="false"[^>]*aria-label="Opción 2 disponible"/)
  })

  it('starts a new group as required, choose 1, with one option', () => {
    const html = renderToStaticMarkup(<GroupEditor submitLabel="Add group" onSubmit={done} onCancel={() => undefined} />)
    expect(html).toContain('Obligatorio · elige 1')
    expect(html.match(/aria-label="Nombre de la opción \d+"/g)).toHaveLength(1)
  })
})
