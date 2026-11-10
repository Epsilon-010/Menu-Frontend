import type { MenuCategory, MenuItem } from '../ordering/api.ts'
import type { FeaturedView, MenuSection, SectionType, TextSectionAlign, TextSectionStyle } from './api.ts'

/** The server keeps at most this many sections on the page. */
export const MAX_SECTIONS = 20
export const MAX_FEATURED_ITEMS = 12
export const MAX_FEATURED_TITLE_LENGTH = 60
export const MAX_TEXT_TITLE_LENGTH = 80
export const MAX_TEXT_BODY_LENGTH = 500
export const MAX_IMAGE_CAPTION_LENGTH = 120

const FEATURED_VIEWS: FeaturedView[] = ['carousel', 'grid']
const TEXT_ALIGNS: TextSectionAlign[] = ['left', 'center']
const TEXT_STYLES: TextSectionStyle[] = ['plain', 'highlight']

/** The page the menu had before it was made of sections (the server's default, with the same fixed ids). */
export const DEFAULT_SECTIONS: MenuSection[] = [
  { id: '00000000-0000-4000-8000-000000000001', type: 'hero' },
  { id: '00000000-0000-4000-8000-000000000002', type: 'menu' },
]

/** Sections the admin adds from the gallery; the header can come back once removed, the menu is always there. */
export type AddableSectionType = Exclude<SectionType, 'menu'>

/** How the editor names and explains each kind of section (keyed by every type: none ships without them). */
export const SECTION_TEXT: Record<SectionType, { name: string; hint: string }> = {
  hero: { name: 'Encabezado', hint: 'Tu banner, nombre, eslogan y bienvenida.' },
  menu: { name: 'Menú', hint: 'Tus categorías y productos.' },
  featured: { name: 'Destacados', hint: 'Los productos que quieres recomendar, en carrusel o cuadrícula.' },
  text: { name: 'Texto', hint: 'Una bienvenida, una promoción o un aviso.' },
  divider: { name: 'Separador', hint: 'Una línea para separar secciones.' },
  image: { name: 'Imagen', hint: 'Una foto de tu local, un platillo o una promoción.' },
}

/** What a row of the section list says about its section, besides its name. */
export function sectionSummary(section: MenuSection): string {
  if (section.type === 'text') return section.title || section.body || 'Sin texto'
  if (section.type === 'image') return section.image_id === null ? 'Sin foto todavía' : section.caption || 'Foto sin descripción'
  if (section.type === 'featured') {
    const count = section.item_ids.length
    const products = count === 1 ? '1 producto' : `${count} productos`
    return section.title ? `${section.title} · ${products}` : products
  }
  return SECTION_TEXT[section.type].hint
}

const isText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max

function readSection(raw: unknown): MenuSection | null {
  if (typeof raw !== 'object' || raw === null) return null
  const value = raw as Record<string, unknown>
  const id = value.id
  if (typeof id !== 'string' || id === '') return null
  switch (value.type) {
    case 'hero':
    case 'menu':
    case 'divider':
      return { id, type: value.type }
    case 'featured': {
      const { title, item_ids, view } = value
      if (!isText(title, MAX_FEATURED_TITLE_LENGTH) || !FEATURED_VIEWS.includes(view as FeaturedView)) return null
      if (!Array.isArray(item_ids) || !item_ids.every((entry) => typeof entry === 'string')) return null
      return { id, type: 'featured', title, item_ids: item_ids.slice(0, MAX_FEATURED_ITEMS), view: view as FeaturedView }
    }
    case 'image': {
      const { image_id, caption } = value
      if (!(image_id === null || typeof image_id === 'string') || !isText(caption, MAX_IMAGE_CAPTION_LENGTH)) return null
      return { id, type: 'image', image_id, caption }
    }
    case 'text': {
      const { title, body, align, style } = value
      if (!isText(title, MAX_TEXT_TITLE_LENGTH) || !isText(body, MAX_TEXT_BODY_LENGTH)) return null
      if (!TEXT_ALIGNS.includes(align as TextSectionAlign) || !TEXT_STYLES.includes(style as TextSectionStyle)) return null
      return { id, type: 'text', title, body, align: align as TextSectionAlign, style: style as TextSectionStyle }
    }
    default:
      return null
  }
}

/**
 * The page as the menu can draw it: unknown or malformed sections, repeated ids and extra headers or menus are
 * dropped, and a missing menu goes at the end, so the products always show. No list (an older server) is the
 * default page.
 */
export function normalizeSections(raw: unknown): MenuSection[] {
  if (!Array.isArray(raw)) return DEFAULT_SECTIONS
  const sections: MenuSection[] = []
  const ids = new Set<string>()
  for (const entry of raw.slice(0, MAX_SECTIONS)) {
    const section = readSection(entry)
    if (section === null || ids.has(section.id)) continue
    if ((section.type === 'hero' || section.type === 'menu') && sections.some((other) => other.type === section.type)) continue
    ids.add(section.id)
    sections.push(section)
  }
  if (!sections.some((section) => section.type === 'menu')) {
    const menu = DEFAULT_SECTIONS[1]
    if (sections.length === MAX_SECTIONS) sections.pop()
    sections.push(ids.has(menu.id) ? { id: crypto.randomUUID(), type: 'menu' } : menu)
  }
  return sections
}

/** A new section with friendly starting content. */
export function newSection(type: AddableSectionType, id: string = crypto.randomUUID()): MenuSection {
  switch (type) {
    case 'featured':
      return { id, type, title: 'Recomendados', item_ids: [], view: 'carousel' }
    case 'image':
      return { id, type, image_id: null, caption: '' }
    case 'text':
      return { id, type, title: 'Bienvenidos', body: 'Escribe aquí un mensaje, una promoción o un aviso.', align: 'center', style: 'highlight' }
    default:
      return { id, type }
  }
}

export function canAddSection(sections: readonly MenuSection[], type: SectionType): boolean {
  if (sections.length >= MAX_SECTIONS) return false
  if (type === 'hero' || type === 'menu') return !sections.some((section) => section.type === type)
  return true
}

/** The page with `section` after the one with id `after` (or at the end); unchanged when it cannot be added. */
export function withSectionAdded(sections: readonly MenuSection[], section: MenuSection, after?: string): MenuSection[] {
  if (!canAddSection(sections, section.type)) return [...sections]
  const index = after === undefined ? -1 : sections.findIndex((entry) => entry.id === after)
  const at = index === -1 ? sections.length : index + 1
  return [...sections.slice(0, at), section, ...sections.slice(at)]
}

/** The page without that section; the menu is never removed. */
export function withoutSection(sections: readonly MenuSection[], id: string): MenuSection[] {
  return sections.filter((section) => section.id !== id || section.type === 'menu')
}

/** The page with the section at `from` moved to `to`; out-of-range positions leave it unchanged. */
export function withSectionMoved(sections: readonly MenuSection[], from: number, to: number): MenuSection[] {
  if (from === to || from < 0 || to < 0 || from >= sections.length || to >= sections.length) return [...sections]
  const next = [...sections]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/** The page with new values for one section (its id and type never change). */
export function withSectionChanged(sections: readonly MenuSection[], id: string, changes: Partial<MenuSection>): MenuSection[] {
  return sections.map((section) =>
    section.id === id ? ({ ...section, ...changes, id: section.id, type: section.type } as MenuSection) : section,
  )
}

/**
 * The featured ids after checking or unchecking one product. Ids no longer on the menu are dropped, so a deleted
 * product never counts toward the limit nor blocks new picks; never over the limit nor repeated.
 */
export function withFeaturedItem(itemIds: readonly string[], itemId: string, on: boolean, onMenu: ReadonlySet<string>): string[] {
  const live = itemIds.filter((id) => onMenu.has(id) && id !== itemId)
  if (!on) return live
  const kept = itemIds.filter((id) => onMenu.has(id))
  if (kept.includes(itemId)) return kept
  return live.length >= MAX_FEATURED_ITEMS ? kept : [...live, itemId]
}

/** The picked products still on the menu, in the order the admin chose. */
export function featuredItems(section: { item_ids: readonly string[] }, categories: readonly MenuCategory[]): MenuItem[] {
  const byId = new Map(categories.flatMap((category) => category.items.map((entry) => [entry.id, entry] as const)))
  return section.item_ids.flatMap((id) => byId.get(id) ?? [])
}
