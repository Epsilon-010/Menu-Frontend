import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Theme, ThemeLayout } from './api.ts'
import { DEFAULT_CARDS } from './cards.ts'
import { DEFAULT_LAYOUT } from './layout.ts'
import { MenuHero } from './MenuHero.tsx'
import { DEFAULT_TYPOGRAPHY } from './typography.ts'

const BANNER = 'tenants/t/banners/b'

const THEME = {
  schema_version: 5,
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

describe('the order of the top of the menu', () => {
  // The image tag itself: React may also add a preload link for it at the top.
  const marks = { banner: '<img src="https://img.test/b.jpg"', name: 'Tacos El Primo', tagline: 'Since 1990', welcome: 'Order from your table' }
  const drawn = (html: string) =>
    (Object.keys(marks) as (keyof typeof marks)[]).sort((a, b) => html.indexOf(marks[a]) - html.indexOf(marks[b]))

  it('is banner, name, tagline and welcome by default, the tagline right under the name', () => {
    const html = render({})
    expect(drawn(html)).toEqual(['banner', 'name', 'tagline', 'welcome'])
    expect(html).toMatch(/Tacos El Primo<\/h1><p class="text-base text-muted">Since 1990<\/p><\/div>/)
  })

  it('follows the theme order', () => {
    const html = render({ header_blocks: ['welcome', 'tagline', 'banner', 'name'] })
    expect(drawn(html)).toEqual(['welcome', 'tagline', 'banner', 'name'])
  })

  it('still hides the parts the layout turns off', () => {
    const html = render({ header_blocks: ['tagline', 'welcome', 'name', 'banner'], show_tagline: false, show_banner: false })
    expect(html).not.toContain('Since 1990')
    expect(html).not.toContain('https://img.test/b.jpg')
    expect(html.indexOf('Order from your table')).toBeLessThan(html.indexOf('Tacos El Primo'))
  })
})
