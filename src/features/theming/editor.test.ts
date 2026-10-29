import { describe, expect, it } from 'vitest'
import type { Theme, ThemeColors } from './api.ts'
import { parseHexInput, withBrand, withColor, withMode, withRoleFont, withScale, withTextStyle } from './editor.ts'
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
  schema_version: 2,
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
