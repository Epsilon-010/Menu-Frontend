import { describe, expect, it } from 'vitest'
import type { Theme, ThemeColors } from './api.ts'
import { parseHexInput, withBrand, withColor, withMode } from './editor.ts'

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
  schema_version: 1,
  colors: LIGHT,
  brand: {
    name: '',
    tagline: '',
    welcome_message: '',
    logo: { image_id: null, size: 'md', position: 'center' },
    banner: { image_id: null, height: 'md', overlay_color: '#000000', overlay_opacity: 30 },
    background: { kind: 'none', image_id: null, pattern: 'dots', opacity: 10, blur: 0 },
  },
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
