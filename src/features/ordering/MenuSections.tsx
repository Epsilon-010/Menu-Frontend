import type { ReactNode } from 'react'
import type { FeaturedSection, ImageUrls, MenuSection, TextSection, ThemeCards, ThemeLayout } from '../theming/api.ts'
import { cardTemplate } from '../theming/cards.ts'
import { featuredItems } from '../theming/sections.ts'
import type { MenuCategory } from './api.ts'
import { CategoryHeading, ProductList } from './MenuBrowser.tsx'

type OnAdd = (itemId: string, quantity: number, note: string, optionIds: string[]) => Promise<string | null>

interface MenuSectionsProps {
  sections: MenuSection[]
  /** Drawn where the `hero` section is. */
  hero: ReactNode
  /** Drawn where the `menu` section is (the categories, or their loading state). */
  menu: ReactNode
  /** The menu's categories, for the featured products (empty while loading). */
  categories: MenuCategory[]
  layout: ThemeLayout
  cards: ThemeCards
  onAdd: OnAdd
  /** Delivery URLs of the theme's images, by public id (for picture sections). */
  imageUrls?: ImageUrls
  /** Editor preview only: the section being edited, and picking one by clicking it. */
  selectedId?: string | null
  onSelect?: (id: string) => void
}

function Placeholder({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border-2 border-dashed border-line p-4 text-center text-sm text-muted">{children}</p>
}

function Featured({ section, categories, layout, cards, onAdd }: {
  section: FeaturedSection
  categories: MenuCategory[]
  layout: ThemeLayout
  cards: ThemeCards
  onAdd: OnAdd
}) {
  const items = featuredItems(section, categories)
  return (
    <section className="@container space-y-4">
      {section.title && <CategoryHeading name={section.title} style={layout.category_header} />}
      <ProductList
        items={items}
        label={section.title || 'Destacados'}
        view={section.view}
        columns={layout.columns}
        template={cardTemplate(section.view, cards.template)}
        density={layout.density}
        cards={cards}
        onAdd={onAdd}
      />
    </section>
  )
}

/**
 * A message of the business. It reads as a statement, not as a product description: the title and the body use the
 * theme's fonts at a larger size (`type-statement`, `type-lead`), under a short accent rule.
 */
function Text({ section }: { section: TextSection }) {
  const highlight = section.style === 'highlight'
  const centered = section.align === 'center'
  const box = highlight ? 'rounded-2xl bg-brand px-6 py-10 text-brand-ink' : 'px-1 py-2'
  return (
    <section className={`space-y-3 ${box} ${centered ? 'text-center' : 'text-left'}`}>
      <span aria-hidden className={`block h-1 w-12 rounded-full ${highlight ? 'bg-brand-ink/60' : 'bg-accent'} ${centered ? 'mx-auto' : ''}`} />
      {section.title && <h2 className={`type-statement text-balance ${highlight ? '' : 'text-secondary'}`}>{section.title}</h2>}
      {section.body && (
        <p
          className={`type-lead max-w-[60ch] text-pretty whitespace-pre-line ${centered ? 'mx-auto' : ''} ${
            highlight ? 'opacity-90' : 'text-ink-soft'
          }`}
        >
          {section.body}
        </p>
      )}
    </section>
  )
}

/**
 * The menu page as the theme's sections say, top to bottom. On the real menu empty sections draw nothing; in the
 * editor preview (`onSelect`) they show a hint, and clicking any section picks it for editing.
 */
export function MenuSections({
  sections,
  hero,
  menu,
  categories,
  layout,
  cards,
  onAdd,
  imageUrls = {},
  selectedId,
  onSelect,
}: MenuSectionsProps) {
  const editing = onSelect !== undefined
  const draw = (section: MenuSection): ReactNode => {
    switch (section.type) {
      case 'hero':
        return hero
      case 'menu':
        return menu
      case 'featured':
        if (featuredItems(section, categories).length === 0) {
          return editing ? <Placeholder>Elige los productos que quieres destacar.</Placeholder> : null
        }
        return <Featured section={section} categories={categories} layout={layout} cards={cards} onAdd={onAdd} />
      case 'text':
        if (section.title === '' && section.body === '') {
          return editing ? <Placeholder>Escribe un título o un mensaje.</Placeholder> : null
        }
        return <Text section={section} />
      case 'divider':
        return <hr className="border-t-2 border-line" />
      case 'image': {
        const url = section.image_id === null ? undefined : imageUrls[section.image_id]
        if (url === undefined) return editing ? <Placeholder>Sube una foto para esta sección.</Placeholder> : null
        return (
          <figure className="space-y-2">
            <img src={url} alt={section.caption} className="aspect-video w-full rounded-2xl object-cover" />
            {section.caption && <figcaption className="type-description text-center text-ink-soft">{section.caption}</figcaption>}
          </figure>
        )
      }
    }
  }

  return sections.map((section) => {
    const content = draw(section)
    if (content === null || content === undefined || content === false) return null
    if (!editing) {
      return (
        <div key={section.id} data-section={section.type}>
          {content}
        </div>
      )
    }
    const selected = section.id === selectedId
    return (
      // A mouse shortcut only: the sections panel lists every section for keyboard and screen reader users.
      <div
        key={section.id}
        data-section={section.type}
        data-selected={selected ? 'true' : undefined}
        onClick={() => onSelect(section.id)}
        // Width and style go with each state. In Tailwind 4 `outline-2` on the base classes also sets a style
        // (solid by default), which drew an outline around every section, picked or not.
        className={`-m-2 cursor-pointer rounded-2xl p-2 outline-offset-2 ${
          selected ? 'outline-2 outline-solid outline-brand' : 'hover:outline-2 hover:outline-dashed hover:outline-line-strong'
        }`}
      >
        {content}
      </div>
    )
  })
}
