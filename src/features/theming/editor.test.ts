import { describe, expect, it } from 'vitest'
import type { Theme, ThemeColors, ThemePreset } from './api.ts'
import {
  keepNewerEdits,
  matchingPreset,
  parseHexInput,
  readThemeFile,
  removedImagesText,
  themeFileName,
  withBrand,
  withDefaults,
  withColor,
  withCards,
  withLayout,
  withMode,
  withPreset,
  withRoleFont,
  withScale,
  withTextStyle,
} from './editor.ts'
import { DEFAULT_CARDS } from './cards.ts'
import { DEFAULT_LAYOUT } from './layout.ts'
import { DEFAULT_TYPOGRAPHY } from './typography.ts'

const LIGHT: ThemeColors = {
  mode: 'light',
  primary: '#c2410c',
  secondary: '#1f2937',
  accent: '#f59e0b',
  background: '#fafaf9',
  surface: '#ffffff',
  text: '#18181b',
  text_muted: '#52525b',
  price: '#9a3412',
  button_bg: '#c2410c',
  button_text: '#ffffff',
  button_hover: '#9a3412',
  border: '#e4e4e7',
  badge_bg: '#fef3c7',
  badge_text: '#92400e',
  cart_bg: '#18181b',
  cart_text: '#ffffff',
  gradient: { enabled: false, from: '#c2410c', to: '#f59e0b', angle: 135 },
}
const DARK: ThemeColors = { ...LIGHT, mode: 'dark', background: '#09090b', text: '#fafafa' }

const THEME: Theme = {
  schema_version: 4,
  colors: LIGHT,
  brand: {
    name: '',
    tagline: '',
    welcome_message: '',
    logo: { image_id: null, size: 'md', position: 'center' },
    banner: { image_id: null, height: 'md', overlay_color: '#000000', overlay_opacity: 30 },
    background: { kind: 'none', image_id: null, pattern: 'dots', opacity: 10, blur: 0 },
  },
  typography: DEFAULT_TYPOGRAPHY,
  layout: DEFAULT_LAYOUT,
  cards: DEFAULT_CARDS,
}

describe('parseHexInput', () => {
  it('accepts short and long hex colors, with or without #, and normalizes them', () => {
    expect(parseHexInput('#ABC')).toBe('#aabbcc')
    expect(parseHexInput(' 1a2B3c ')).toBe('#1a2b3c')
  })

  it('rejects anything else', () => {
    for (const text of ['', 'red', '#12345', '#gggggg', '#fff;}body{', 'url(x)']) {
      expect(parseHexInput(text)).toBeNull()
    }
  })
})

describe('theme edits', () => {
  it('changes one color without touching the rest', () => {
    const edited = withColor(THEME, 'price', '#000000')
    expect(edited.colors).toEqual({ ...LIGHT, price: '#000000' })
    expect(THEME.colors.price).toBe('#9a3412')
  })

  it('switching mode starts from that mode default palette', () => {
    const customized = withColor(THEME, 'primary', '#123456')
    expect(withMode(customized, 'dark', { light: LIGHT, dark: DARK }).colors).toEqual(DARK)
    expect(withMode(customized, 'light', { light: LIGHT, dark: DARK }).colors).toEqual(LIGHT)
  })

  it('merges brand sections one level deep', () => {
    const edited = withBrand(THEME, { logo: { ...THEME.brand.logo, image_id: 'tenants/t/logos/a' }, tagline: 'Since 1990' })
    expect(edited.brand.logo).toEqual({ image_id: 'tenants/t/logos/a', size: 'md', position: 'center' })
    expect(edited.brand.tagline).toBe('Since 1990')
    expect(edited.brand.banner).toBe(THEME.brand.banner)
  })
})

describe('typography edits', () => {
  it('changing a role font moves the elements that use it to weights and styles the font has', () => {
    const italic = withTextStyle(withRoleFont(THEME, 'heading', 'lora'), 'business_name', { style: 'italic', weight: 700 })
    const changed = withRoleFont(italic, 'heading', 'bebas_neue')
    expect(changed.typography.fonts.heading).toBe('bebas_neue')
    for (const element of ['business_name', 'category', 'product_name'] as const) {
      expect(changed.typography.elements[element]).toMatchObject({ weight: 400, style: 'normal' })
    }
    // Elements on other roles keep their settings.
    expect(changed.typography.elements.price).toEqual(THEME.typography.elements.price)
    expect(THEME.typography.fonts.heading).toBe('geist')
  })

  it('moving an element to another role fits it to that role font', () => {
    const theme = withRoleFont(THEME, 'price', 'pacifico')
    const moved = withTextStyle(theme, 'product_name', { font: 'price' })
    expect(moved.typography.elements.product_name).toMatchObject({ font: 'price', weight: 400 })
    expect(withTextStyle(THEME, 'description', { size: 18 }).typography.elements.description.size).toBe(18)
  })

  it('sets the global scale', () => {
    expect(withScale(THEME, 120).typography.scale).toBe(120)
  })
})

describe('presets', () => {
  const STREET: ThemePreset = {
    id: 'street',
    name: 'Street',
    description: 'Black and yellow.',
    colors: { ...DARK, primary: '#facc15' },
    typography: { ...DEFAULT_TYPOGRAPHY, fonts: { heading: 'oswald', body: 'inter', price: 'oswald', button: 'oswald' } },
    layout: { ...DEFAULT_LAYOUT, navigation: 'tabs', product_view: 'list', cart: 'floating' },
    cards: { ...DEFAULT_CARDS, template: 'horizontal', radius: 'none' },
  }
  const CLASSIC: ThemePreset = {
    id: 'classic',
    name: 'Classic',
    description: 'Default.',
    colors: LIGHT,
    typography: DEFAULT_TYPOGRAPHY,
    layout: DEFAULT_LAYOUT,
    cards: DEFAULT_CARDS,
  }

  it('applying a preset replaces colors, typography, layout and cards and keeps the brand', () => {
    const mine = withBrand(THEME, { name: 'Tacos El Primo', logo: { ...THEME.brand.logo, image_id: 'tenants/t/logos/a' } })
    const applied = withPreset(mine, STREET)
    expect(applied).toEqual({
      ...mine,
      colors: STREET.colors,
      typography: STREET.typography,
      layout: STREET.layout,
      cards: STREET.cards,
    })
    expect(applied.brand).toBe(mine.brand)
  })

  it('tells which preset the theme still matches, if any', () => {
    expect(matchingPreset(THEME, [CLASSIC, STREET])).toBe('classic')
    expect(matchingPreset(withPreset(THEME, STREET), [CLASSIC, STREET])).toBe('street')
    expect(matchingPreset(withColor(THEME, 'price', '#000000'), [CLASSIC, STREET])).toBeNull()
    expect(matchingPreset(withScale(THEME, 120), [CLASSIC, STREET])).toBeNull()
    expect(matchingPreset(withLayout(THEME, { columns: 3 }), [CLASSIC, STREET])).toBeNull()
    expect(matchingPreset(withCards(THEME, { hover: 'lift' }), [CLASSIC, STREET])).toBeNull()
  })

  it('changes card options and keeps everything else', () => {
    const changed = withCards(THEME, { template: 'overlay', add_button: { style: 'icon', shape: 'pill' } })
    expect(changed.cards).toEqual({ ...DEFAULT_CARDS, template: 'overlay', add_button: { style: 'icon', shape: 'pill' } })
    expect({ ...changed, cards: THEME.cards }).toEqual(THEME)
  })
})

describe('layout edits', () => {
  it('changes only the given layout options', () => {
    const changed = withLayout(THEME, { navigation: 'sidebar', cart: 'panel' })
    expect(changed.layout).toEqual({ ...DEFAULT_LAYOUT, navigation: 'sidebar', cart: 'panel' })
    expect(changed.colors).toBe(THEME.colors)
    expect(changed.typography).toBe(THEME.typography)
    expect(changed.brand).toBe(THEME.brand)
  })
})

describe('after a save or publish answers', () => {
  it('takes the server copy when nothing changed meanwhile', () => {
    const sent = withColor(THEME, 'primary', '#123456')
    // The server normalizes (here: trims the name), so its copy replaces what was sent.
    const saved = withBrand(sent, { name: 'Tacos' })
    expect(keepNewerEdits(sent, sent, saved)).toBe(saved)
  })

  it('keeps edits and uploads made while the request was in flight', () => {
    const sent = withColor(THEME, 'primary', '#123456')
    const editedMeanwhile = withBrand(sent, { tagline: 'Since 1990', logo: { ...sent.brand.logo, image_id: 'tenants/t/logos/a' } })
    expect(keepNewerEdits(editedMeanwhile, sent, sent)).toBe(editedMeanwhile)
  })
})

describe('reset, export and import', () => {
  const brand = { name: 'Tacos El Primo', logo: { image_id: 'tenants/t/logo/a' } } as unknown as Theme['brand']
  const preset = (id: string, primary: string): ThemePreset =>
    ({
      id,
      name: id,
      description: '',
      colors: { ...LIGHT, primary },
      typography: DEFAULT_TYPOGRAPHY,
      layout: DEFAULT_LAYOUT,
      cards: DEFAULT_CARDS,
    }) as ThemePreset

  it('resets everything but the brand to the default design (the first template)', () => {
    const theme = {
      schema_version: 4,
      colors: { ...LIGHT, primary: '#000000' },
      brand,
      typography: DEFAULT_TYPOGRAPHY,
      layout: { ...DEFAULT_LAYOUT, navigation: 'tabs' },
      cards: { ...DEFAULT_CARDS, template: 'overlay' },
    } as Theme
    const reset = withDefaults(theme, [preset('classic', '#c2410c'), preset('bistro', '#111111')])
    expect(reset.colors.primary).toBe('#c2410c')
    expect(reset.layout).toEqual(DEFAULT_LAYOUT)
    expect(reset.cards).toEqual(DEFAULT_CARDS)
    expect(reset.brand).toBe(brand)
  })

  it('leaves the theme as it is when the server sent no templates', () => {
    const theme = { colors: LIGHT, brand } as Theme
    expect(withDefaults(theme, [])).toBe(theme)
  })

  it('reads an exported file as JSON, or says it is not a design', () => {
    expect(readThemeFile('{"schema_version": 3}')).toEqual({ schema_version: 3 })
    expect(() => readThemeFile('not json')).toThrow('That file is not a menu design. Choose a .json file exported from this editor.')
    expect(() => readThemeFile('[1, 2]')).toThrow('That file is not a menu design. Choose a .json file exported from this editor.')
  })

  it('names the file with the business and the day', () => {
    expect(themeFileName('Tacos El Primo!', new Date(2026, 9, 30))).toBe('tacos-el-primo-design-2026-10-30.json')
    expect(themeFileName('', new Date(2026, 0, 5))).toBe('menu-design-2026-01-05.json')
  })

  it('tells which images were left out of an import', () => {
    expect(removedImagesText([])).toBeNull()
    expect(removedImagesText(['logo'])).toBe('The logo was left out: it belongs to another business. Upload your own.')
    expect(removedImagesText(['logo', 'banner', 'background'])).toBe(
      'The logo, banner and background image were left out: they belong to another business. Upload your own.',
    )
  })
})
