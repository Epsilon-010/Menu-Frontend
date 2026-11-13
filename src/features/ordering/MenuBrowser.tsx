import { BowlFoodIcon } from '@phosphor-icons/react'
import { useEffect, useState, type ReactNode } from 'react'
import { MOTION } from '../../shared/ui/classes.ts'
import { EmptyState } from '../../shared/ui/Feedback.tsx'
import type { CardTemplate, CategoryHeader, Density, ProductView, ThemeCards, ThemeLayout } from '../theming/api.ts'
import { DEFAULT_CARDS } from '../theming/cards.ts'
import {
  categoryArrangement,
  currentCategoryId,
  DEFAULT_LAYOUT,
  densitySpacing,
  gridColumnsClass,
  phoneGridClass,
  showsOneCategory,
} from '../theming/layout.ts'
import type { MenuCategory, MenuItem } from './api.ts'
import { ProductCard } from './ProductCard.tsx'

interface MenuBrowserProps {
  categories: MenuCategory[]
  onAdd: (itemId: string, quantity: number, note: string, optionIds: string[]) => Promise<string | null>
  /** How the menu is arranged (the default arrangement while there is no theme). */
  layout?: ThemeLayout
  /** How each product card looks (the default card while there is no theme). */
  cards?: ThemeCards
  /** On the real menu the page's fixed bar covers the top; in the editor preview nothing does. */
  belowFixedBar?: boolean
}

function sectionId(categoryId: string): string {
  return `category-${categoryId}`
}

/** The section in view while scrolling one long page (the one crossing the upper third of the screen). */
function useActiveSection(ids: string[], enabled: boolean): string | null {
  const [active, setActive] = useState<string | null>(null)
  const key = ids.join(' ')
  useEffect(() => {
    if (!enabled) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting)
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    for (const id of key.split(' ')) {
      const element = document.getElementById(sectionId(id))
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [key, enabled])
  return active
}

export function CategoryHeading({ name, style }: { name: string; style: CategoryHeader }) {
  if (style === 'band') return <h2 className="type-category rounded-xl bg-brand px-4 py-2 text-brand-ink">{name}</h2>
  if (style === 'underline') return <h2 className="type-category border-b-2 border-accent pb-2 text-secondary">{name}</h2>
  return (
    <h2 className="type-category text-secondary">
      <span aria-hidden className="mr-2 inline-block h-2 w-2 rounded-full bg-accent align-middle" />
      {name}
    </h2>
  )
}

interface ProductListProps {
  items: MenuItem[]
  /** Names the carousel region for screen readers. */
  label: string
  view: ProductView
  columns: number
  template: CardTemplate
  density: Density
  cards: ThemeCards
  onAdd: MenuBrowserProps['onAdd']
}

/** Product cards as a list, a carousel or a grid (a category's products, or the ones the admin featured). */
export function ProductList({ items, label, view, columns, template, density, cards, onAdd }: ProductListProps) {
  const { items: gap } = densitySpacing(density)
  const card = (item: MenuItem) => (
    <ProductCard
      key={item.id}
      item={item}
      cards={cards}
      template={template}
      onAdd={(quantity, note, optionIds) => onAdd(item.id, quantity, note, optionIds)}
    />
  )
  if (view === 'list') return <div className={`flex flex-col ${gap}`}>{items.map(card)}</div>
  if (view === 'carousel') {
    return (
      <div
        role="region"
        aria-label={`${label}, desliza para ver más`}
        tabIndex={0}
        className={`-mx-4 flex snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 pb-2 ${gap}`}
      >
        {items.map((item) => (
          <div key={item.id} className="w-[78%] max-w-80 shrink-0 snap-start @2xl:w-72">
            {card(item)}
          </div>
        ))}
      </div>
    )
  }
  return <div className={['grid', gap, gridColumnsClass(columns), phoneGridClass(columns, template)].filter(Boolean).join(' ')}>{items.map(card)}</div>
}

interface ProductsProps {
  category: MenuCategory
  layout: ThemeLayout
  cards: ThemeCards
  onAdd: MenuBrowserProps['onAdd']
}

/** The products of one category: its own view, columns and card template when it has them, else the general ones. */
function Products({ category, layout, cards, onAdd }: ProductsProps) {
  const { product_view, columns, template } = categoryArrangement(layout, cards, category.id)
  return (
    <ProductList
      items={category.items}
      label={category.name}
      view={product_view}
      columns={columns}
      template={template}
      density={layout.density}
      cards={cards}
      onAdd={onAdd}
    />
  )
}

interface CategoryNavProps {
  categories: MenuCategory[]
  current: string | null
  onPick?: (categoryId: string) => void
  stickyTop: string
}

/** Rounded chips that jump to each section of the page. */
function ChipsNav({ categories, current, stickyTop }: CategoryNavProps) {
  return (
    // The bar has its own background: without it the cards scroll visibly behind and between the chips.
    <nav aria-label="Categorías del menú" className={`sticky ${stickyTop} z-20 -mx-4 overflow-x-auto bg-canvas/90 px-4 pb-2 backdrop-blur-md`}>
      <ul className="flex w-max gap-2">
        {categories.map((category) => {
          const active = sectionId(category.id) === current
          return (
            <li key={category.id}>
              <a
                href={`#${sectionId(category.id)}`}
                aria-current={active ? 'true' : undefined}
                className={`inline-flex items-center rounded-lg border px-3 py-2 text-sm font-semibold active:scale-[0.98] pointer-coarse:min-h-11 ${MOTION} ${
                  active ? 'border-brand bg-brand text-brand-ink' : 'border-line bg-surface/90 text-ink-soft backdrop-blur-md hover:border-line-strong hover:text-ink'
                }`}
              >
                {category.name}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

const BAR = 'sticky z-20 -mx-4 overflow-x-auto border-b border-line bg-canvas/90 px-4 backdrop-blur-md'
const UNDERLINED = 'inline-flex border-b-2 px-4 py-3 text-sm font-semibold'

function underlined(active: boolean): string {
  return `${UNDERLINED} ${MOTION} ${active ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink'}`
}

/** A text bar over the long page that underlines the section in view. */
function SectionsNav({ categories, current, stickyTop }: CategoryNavProps) {
  return (
    <nav aria-label="Categorías del menú" className={`${BAR} ${stickyTop}`}>
      <ul className="flex w-max gap-1">
        {categories.map((category) => {
          const active = sectionId(category.id) === current
          return (
            <li key={category.id}>
              <a href={`#${sectionId(category.id)}`} aria-current={active ? 'true' : undefined} className={underlined(active)}>
                {category.name}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Tabs over the products: one category at a time. */
function TabsNav({ categories, current, onPick, stickyTop }: CategoryNavProps) {
  return (
    <nav aria-label="Categorías del menú" className={`${BAR} ${stickyTop}`}>
      <ul className="flex w-max gap-1">
        {categories.map((category) => (
          <li key={category.id}>
            <button
              type="button"
              aria-current={category.id === current ? 'true' : undefined}
              onClick={() => onPick?.(category.id)}
              className={underlined(category.id === current)}
            >
              {category.name}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** A column of categories beside the products when the menu is wide enough; a scrolling row otherwise. */
function SidebarNav({ categories, current, onPick, stickyTop }: CategoryNavProps) {
  return (
    <nav
      aria-label="Categorías del menú"
      className={`sticky ${stickyTop} z-20 -mx-4 overflow-x-auto bg-canvas/90 px-4 py-2 backdrop-blur-md @xl:mx-0 @xl:overflow-visible @xl:bg-transparent @xl:px-0 @xl:backdrop-blur-none`}
    >
      <ul className="flex w-max gap-2 @xl:w-auto @xl:flex-col @xl:gap-1">
        {categories.map((category) => {
          const active = category.id === current
          return (
            <li key={category.id}>
              <button
                type="button"
                aria-current={active ? 'true' : undefined}
                onClick={() => onPick?.(category.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold active:scale-[0.98] ${MOTION} ${
                  active ? 'bg-brand text-brand-ink' : 'text-ink-soft hover:bg-surface'
                }`}
              >
                {category.name}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** The menu: a category navigation (as the theme's layout says) and the item cards with their add form. */
export function MenuBrowser({
  categories,
  onAdd,
  layout = DEFAULT_LAYOUT,
  cards = DEFAULT_CARDS,
  belowFixedBar = true,
}: MenuBrowserProps) {
  const withItems = categories.filter((category) => category.items.length > 0)
  const ids = withItems.map((category) => category.id)
  const [chosen, setChosen] = useState<string | null>(null)
  const activeSection = useActiveSection(ids, layout.navigation === 'sections' || layout.navigation === 'chips')

  if (withItems.length === 0) {
    return (
      <EmptyState icon={<BowlFoodIcon size={24} aria-hidden />} title="El menú se está preparando">
        Aún no hay nada para pedir. Mientras tanto, pide ayuda a tu mesero.
      </EmptyState>
    )
  }

  const spacing = densitySpacing(layout.density)
  // On the real menu the category bar sticks right under the page's top bar (4rem tall).
  const stickyTop = belowFixedBar ? 'top-16 pt-2' : 'top-0 pt-2'
  const scrollMargin = belowFixedBar ? 'scroll-mt-32' : 'scroll-mt-16'
  const section = (category: MenuCategory): ReactNode => (
    <section key={category.id} id={sectionId(category.id)} className={`${scrollMargin} space-y-4`}>
      <CategoryHeading name={category.name} style={layout.category_header} />
      <Products category={category} layout={layout} cards={cards} onAdd={onAdd} />
    </section>
  )

  if (showsOneCategory(layout.navigation)) {
    const current = currentCategoryId(ids, chosen)
    const shown = withItems.find((category) => category.id === current) ?? withItems[0]
    const navProps = { categories: withItems, current, onPick: setChosen }
    if (layout.navigation === 'sidebar') {
      return (
        <div className="@container">
          <div className="space-y-6 @xl:grid @xl:grid-cols-[11rem_minmax(0,1fr)] @xl:items-start @xl:gap-6 @xl:space-y-0">
            <SidebarNav {...navProps} stickyTop={belowFixedBar ? 'top-20 @xl:top-24' : 'top-0'} />
            {section(shown)}
          </div>
        </div>
      )
    }
    return (
      <div className={`@container ${spacing.sections}`}>
        <TabsNav {...navProps} stickyTop={stickyTop} />
        {section(shown)}
      </div>
    )
  }

  const navProps = { categories: withItems, current: activeSection, stickyTop }
  return (
    // A size container: cards and columns follow the menu's own width, not the page's.
    <div className={`@container ${spacing.sections}`}>
      {layout.navigation === 'sections' ? <SectionsNav {...navProps} /> : <ChipsNav {...navProps} />}
      {withItems.map(section)}
    </div>
  )
}
