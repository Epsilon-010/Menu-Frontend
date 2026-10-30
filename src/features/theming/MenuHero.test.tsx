import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Theme, ThemeLayout } from './api.ts'
import { DEFAULT_CARDS } from './cards.ts'
import { DEFAULT_LAYOUT } from './layout.ts'
import { MenuHero } from './MenuHero.tsx'
import { DEFAULT_TYPOGRAPHY } from './typography.ts'

const BANNER = 'tenants/t/banners/b'

const THEME = {
  schema_version: 4,
  colors: { gradient: { enabled: false, from: '#000000', to: '#ffffff', angle: 135 } },
  brand: {
    name: 'Tacos El Primo',
    tagline: 'Since 1990',
    welcome_message: 'Order from your table',
    logo: { image_id: null, size: 'md', position: 'center' },
    banner: { image_id: BANNER, height: 'md', overlay_color: '#000000', overlay_opacity: 30 },
    background: { kind: 'none', image_id: null, pattern: 'dots', opacity: 10, blur: 0 },
  },
  typography: DEFAULT_TYPOGRAPHY,
  layout: DEFAULT_LAYOUT,
  cards: DEFAULT_CARDS,
} as unknown as Theme

function render(changes: Partial<ThemeLayout>): string {
  return renderToStaticMarkup(
    <MenuHero
      theme={{ ...THEME, layout: { ...DEFAULT_LAYOUT, ...changes } }}
      imageUrls={{ [BANNER]: 'https://img.test/b.jpg' }}
      businessName="Demo"
    />,
  )
}

describe('the top of the menu', () => {
  it('shows the banner, tagline and welcome message by default', () => {
    const html = render({})
    expect(html).toContain('https://img.test/b.jpg')
    expect(html).toContain('Since 1990')
    expect(html).toContain('Order from your table')
  })

  it('hides each part the layout turns off, and always keeps the name', () => {
    const html = render({ show_banner: false, show_tagline: false, show_welcome: false })
    expect(html).not.toContain('https://img.test/b.jpg')
    expect(html).not.toContain('Since 1990')
    expect(html).not.toContain('Order from your table')
    expect(html).toContain('Tacos El Primo')
  })
})
