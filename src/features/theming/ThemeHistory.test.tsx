import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Theme, ThemeVersion } from './api.ts'
import { ThemeHistory } from './ThemeHistory.tsx'

const THEME = { schema_version: 4 } as Theme

function version(number: number, publishedAt: string): ThemeVersion {
  return { id: `v${number}`, number, published_at: publishedAt, theme: THEME }
}

function render(versions: ThemeVersion[] | null, error: string | null = null): string {
  return renderToStaticMarkup(
    <ThemeHistory versions={versions} error={error} onRestore={() => undefined} onRetry={() => undefined} />,
  )
}

describe('theme history', () => {
  it('lists every version newest first, the newest marked as what the tables show', () => {
    const html = render([version(3, '2026-10-30T12:00:00Z'), version(2, '2026-10-29T12:00:00Z')])
    expect(html.indexOf('Versión 3')).toBeLessThan(html.indexOf('Versión 2'))
    expect(html).toContain('En las mesas')
    expect(html.match(/>Restaurar</g)).toHaveLength(2)
  })

  it('says when nothing was published yet', () => {
    expect(render([])).toContain('Aún no hay nada publicado.')
  })

  it('shows a loading state and a load error with a retry', () => {
    expect(render(null)).toContain('Cargando las versiones publicadas')
    const html = render(null, 'Could not reach the server.')
    expect(html).toContain('Could not reach the server.')
    expect(html).toContain('>Reintentar<')
  })
})
