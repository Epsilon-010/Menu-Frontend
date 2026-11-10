import { describe, expect, it } from 'vitest'
import type { MenuCategory, MenuItem } from '../ordering/api.ts'
import type { FeaturedSection, MenuSection, TextSection } from './api.ts'
import {
  canAddSection,
  DEFAULT_SECTIONS,
  featuredItems,
  MAX_FEATURED_ITEMS,
  MAX_SECTIONS,
  newSection,
  normalizeSections,
  sectionSummary,
  withSectionAdded,
  withSectionChanged,
  withSectionMoved,
  withoutSection,
} from './sections.ts'

const HERO = DEFAULT_SECTIONS[0]
const MENU = DEFAULT_SECTIONS[1]
const ID = '0b6f3c2e-6a8d-4f6e-9a51-3d2c1b0a9f87'

function text(id: string, changes: Partial<TextSection> = {}): TextSection {
  return { id, type: 'text', title: 'Promo', body: '2x1', align: 'center', style: 'plain', ...changes }
}

function featured(id: string, item_ids: string[]): FeaturedSection {
  return { id, type: 'featured', title: 'Lo más pedido', item_ids, view: 'carousel' }
}

function item(id: string): MenuItem {
  return { id, name: id, description: '', price_cents: 100, image: null, badges: [], modifier_groups: [] }
}

describe('normalizeSections', () => {
  it('keeps a valid page as it is', () => {
    const page: MenuSection[] = [text('a'), HERO, featured('b', [ID]), { id: 'c', type: 'divider' }, MENU]
    expect(normalizeSections(page)).toEqual(page)
  })

  it('falls back to the default page when there is no list (an older server)', () => {
    expect(normalizeSections(undefined)).toEqual(DEFAULT_SECTIONS)
    expect(normalizeSections({})).toEqual(DEFAULT_SECTIONS)
  })

  it('drops unknown or malformed sections and repeated ids, and keeps one header', () => {
    const raw = [
      { id: 'x', type: 'video' },
      text('a', { align: 'right' as never }),
      { id: 'b', type: 'featured', title: 'x', item_ids: 'nope', view: 'grid' },
      HERO,
      { ...HERO, id: 'other-hero' },
      MENU,
      { id: MENU.id, type: 'divider' },
      null,
    ]
    expect(normalizeSections(raw)).toEqual([HERO, MENU])
  })

  it('adds the menu at the end when it is missing, so the products always show', () => {
    expect(normalizeSections([text('a')])).toEqual([text('a'), MENU])
  })
})

describe('the page builder', () => {
  it('adds a section after the selected one, or at the end', () => {
    const added = text('new')
    expect(withSectionAdded(DEFAULT_SECTIONS, added)).toEqual([HERO, MENU, added])
    expect(withSectionAdded(DEFAULT_SECTIONS, added, HERO.id)).toEqual([HERO, added, MENU])
  })

  it('never adds a second header or menu, nor more than the limit', () => {
    expect(canAddSection(DEFAULT_SECTIONS, 'hero')).toBe(false)
    expect(canAddSection([MENU], 'hero')).toBe(true)
    expect(canAddSection(DEFAULT_SECTIONS, 'menu')).toBe(false)
    const full = [MENU, ...Array.from({ length: MAX_SECTIONS - 1 }, (_, index) => text(`t${index}`))]
    expect(canAddSection(full, 'text')).toBe(false)
    expect(withSectionAdded(full, text('extra'))).toEqual(full)
  })

  it('removes any section but the menu', () => {
    expect(withoutSection(DEFAULT_SECTIONS, HERO.id)).toEqual([MENU])
    expect(withoutSection(DEFAULT_SECTIONS, MENU.id)).toEqual(DEFAULT_SECTIONS)
  })

  it('moves and changes one section', () => {
    expect(withSectionMoved(DEFAULT_SECTIONS, 1, 0)).toEqual([MENU, HERO])
    const page = [HERO, text('a'), MENU]
    expect(withSectionChanged(page, 'a', { title: 'Hola' })).toEqual([HERO, text('a', { title: 'Hola' }), MENU])
  })

  it('creates new sections with a fresh id and friendly starting content', () => {
    const first = newSection('text')
    const second = newSection('text')
    expect(first.id).not.toBe(second.id)
    expect(first).toMatchObject({ type: 'text', align: 'center', style: 'highlight' })
    expect(newSection('featured')).toMatchObject({ type: 'featured', item_ids: [], view: 'carousel' })
    expect(newSection('divider')).toMatchObject({ type: 'divider' })
    expect(newSection('image')).toMatchObject({ type: 'image', image_id: null, caption: '' })
    expect(normalizeSections([{ id: 'p', type: 'image', image_id: 7, caption: '' }, MENU])).toEqual([MENU])
  })
})

describe('sectionSummary', () => {
  it('says what each row holds in plain words', () => {
    expect(sectionSummary(text('a', { title: 'Promo' }))).toBe('Promo')
    expect(sectionSummary(text('a', { title: '', body: '' }))).toBe('Sin texto')
    expect(sectionSummary(featured('f', ['x']))).toBe('Lo más pedido · 1 producto')
    expect(sectionSummary({ ...featured('f', ['x', 'y']), title: '' })).toBe('2 productos')
    expect(sectionSummary(MENU)).toBe('Tus categorías y productos.')
  })
})

describe('featuredItems', () => {
  const menu: MenuCategory[] = [
    { id: 'c1', name: 'Tacos', items: [item('i1'), item('i2')] },
    { id: 'c2', name: 'Bebidas', items: [item('i3')] },
  ]

  it('returns the picked products in the order the admin chose, skipping the ones no longer on the menu', () => {
    expect(featuredItems(featured('f', ['i3', 'gone', 'i1']), menu).map((entry) => entry.id)).toEqual(['i3', 'i1'])
  })

  it('caps the products at the limit', () => {
    expect(MAX_FEATURED_ITEMS).toBe(12)
  })
})
