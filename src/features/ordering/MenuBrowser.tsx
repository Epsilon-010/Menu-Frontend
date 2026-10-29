import { BowlFoodIcon, MinusIcon, PlusIcon } from '@phosphor-icons/react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Button, IconButton } from '../../shared/ui/Button.tsx'
import { MOTION } from '../../shared/ui/classes.ts'
import { Field, TextInput } from '../../shared/ui/Field.tsx'
import { EmptyState, ErrorText } from '../../shared/ui/Feedback.tsx'
import { formatMoney } from '../catalog/price.ts'
import type { CategoryHeader, ThemeLayout } from '../theming/api.ts'
import { currentCategoryId, DEFAULT_LAYOUT, densitySpacing, gridColumnsClass, showsOneCategory } from '../theming/layout.ts'
import { MAX_NOTE_LENGTH, MAX_QUANTITY, MIN_QUANTITY, type MenuCategory, type MenuItem } from './api.ts'

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  /** What is being counted, for screen readers ("Tacos al pastor"). */
  label: string
}

export function QuantityStepper({ value, onChange, disabled = false, label }: QuantityStepperProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface p-1">
      <IconButton
        label={`One less ${label}`}
        icon={<MinusIcon size={16} />}
        disabled={disabled || value <= MIN_QUANTITY}
        onClick={() => onChange(value - 1)}
        className="p-1"
      />
      <span aria-live="polite" className="min-w-8 text-center text-sm font-semibold text-ink tabular-nums">
        {value}
      </span>
      <IconButton
        label={`One more ${label}`}
        icon={<PlusIcon size={16} />}
        disabled={disabled || value >= MAX_QUANTITY}
        onClick={() => onChange(value + 1)}
        className="p-1"
      />
    </div>
  )
}

interface ItemCardProps {
  item: MenuItem
  onAdd: (quantity: number, note: string) => Promise<string | null>
  /** List rows put the image beside the text instead of above it. */
  horizontal?: boolean
}

function ItemCard({ item, onAdd, horizontal = false }: ItemCardProps) {
  const [adding, setAdding] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const image = item.image?.card_url ?? null

  function close() {
    setAdding(false)
    setQuantity(1)
    setNote('')
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const failure = await onAdd(quantity, note)
    setBusy(false)
    if (failure === null) close()
    else setError(failure)
  }

  return (
    <article
      className={`flex h-full overflow-hidden rounded-2xl border border-line bg-surface ${horizontal ? 'flex-row' : 'flex-col'}`}
    >
      {image && (
        <img
          src={image}
          alt={item.name}
          loading="lazy"
          className={horizontal ? 'w-28 shrink-0 bg-subtle object-cover @2xl:w-40' : 'aspect-[4/3] w-full bg-subtle object-cover'}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-start justify-between gap-4">
            <h3 className="type-product-name flex-1 text-pretty text-ink">{item.name}</h3>
            <p className="type-price shrink-0 text-price tabular-nums">{formatMoney(item.price_cents)}</p>
          </div>
          {item.description && <p className="type-description line-clamp-3 text-pretty text-muted">{item.description}</p>}
        </div>

        {adding ? (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-canvas p-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-ink-soft">How many</span>
              <QuantityStepper value={quantity} onChange={setQuantity} disabled={busy} label={item.name} />
            </div>
            <Field label="Note for the kitchen (optional)">
              <TextInput
                maxLength={MAX_NOTE_LENGTH}
                placeholder="No onion, extra salsa"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={busy}
              />
            </Field>
            {error && <ErrorText>{error}</ErrorText>}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={busy} className="type-button flex-1">
                {busy ? 'Adding…' : `Add ${quantity} · ${formatMoney(item.price_cents * quantity)}`}
              </Button>
              <Button variant="ghost" disabled={busy} onClick={close} className="type-button">
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="secondary"
            icon={<PlusIcon size={16} aria-hidden />}
            onClick={() => setAdding(true)}
            className="type-button"
          >
            Add
          </Button>
        )}
      </div>
    </article>
  )
}

interface MenuBrowserProps {
  categories: MenuCategory[]
  onAdd: (itemId: string, quantity: number, note: string) => Promise<string | null>
  /** How the menu is arranged (the default arrangement while there is no theme). */
  layout?: ThemeLayout
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

function CategoryHeading({ name, style }: { name: string; style: CategoryHeader }) {
  if (style === 'band') return <h2 className="type-category rounded-xl bg-brand px-4 py-2 text-brand-ink">{name}</h2>
  if (style === 'underline') return <h2 className="type-category border-b-2 border-accent pb-2 text-secondary">{name}</h2>
  return (
    <h2 className="type-category text-secondary">
      <span aria-hidden className="mr-2 inline-block h-2 w-2 rounded-full bg-accent align-middle" />
      {name}
    </h2>
  )
}

interface ProductsProps {
  category: MenuCategory
  layout: ThemeLayout
  onAdd: MenuBrowserProps['onAdd']
}

function Products({ category, layout, onAdd }: ProductsProps) {
  const { items: gap } = densitySpacing(layout.density)
  const horizontal = layout.product_view === 'list'
  const card = (item: MenuItem) => (
    <ItemCard key={item.id} item={item} horizontal={horizontal} onAdd={(quantity, note) => onAdd(item.id, quantity, note)} />
  )
  if (layout.product_view === 'list') return <div className={`flex flex-col ${gap}`}>{category.items.map(card)}</div>
  if (layout.product_view === 'carousel') {
    return (
      <div
        role="region"
        aria-label={`${category.name}, swipe for more`}
        tabIndex={0}
        className={`-mx-4 flex snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 pb-2 ${gap}`}
      >
        {category.items.map((item) => (
          <div key={item.id} className="w-[78%] max-w-80 shrink-0 snap-start @2xl:w-72">
            {card(item)}
          </div>
        ))}
      </div>
    )
  }
  return <div className={`grid ${gap} ${gridColumnsClass(layout.columns)}`}>{category.items.map(card)}</div>
}

interface CategoryNavProps {
  categories: MenuCategory[]
  current: string | null
  onPick?: (categoryId: string) => void
  stickyTop: string
}

/** Rounded chips that jump to each section of the page. */
function ChipsNav({ categories, stickyTop }: CategoryNavProps) {
  return (
    <nav aria-label="Menu categories" className={`sticky ${stickyTop} z-20 -mx-4 overflow-x-auto px-4 py-2 sm:mx-0 sm:px-0`}>
      <ul className="flex w-max gap-2">
        {categories.map((category) => (
          <li key={category.id}>
            <a
              href={`#${sectionId(category.id)}`}
              className={`inline-flex rounded-lg border border-line bg-surface/90 px-3 py-2 text-sm font-semibold text-ink-soft backdrop-blur-md hover:bg-brand hover:text-brand-ink active:scale-[0.98] ${MOTION}`}
            >
              {category.name}
            </a>
          </li>
        ))}
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
    <nav aria-label="Menu categories" className={`${BAR} ${stickyTop}`}>
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
    <nav aria-label="Menu categories" className={`${BAR} ${stickyTop}`}>
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

/** A column of categories beside the products on tablets and up; a scrolling row on phones. */
function SidebarNav({ categories, current, onPick, stickyTop }: CategoryNavProps) {
  return (
    <nav
      aria-label="Menu categories"
      className={`sticky ${stickyTop} z-20 -mx-4 overflow-x-auto bg-canvas/90 px-4 py-2 backdrop-blur-md @3xl:mx-0 @3xl:overflow-visible @3xl:bg-transparent @3xl:px-0 @3xl:backdrop-blur-none`}
    >
      <ul className="flex w-max gap-2 @3xl:w-auto @3xl:flex-col @3xl:gap-1">
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
export function MenuBrowser({ categories, onAdd, layout = DEFAULT_LAYOUT, belowFixedBar = true }: MenuBrowserProps) {
  const withItems = categories.filter((category) => category.items.length > 0)
  const ids = withItems.map((category) => category.id)
  const [chosen, setChosen] = useState<string | null>(null)
  const activeSection = useActiveSection(ids, layout.navigation === 'sections')

  if (withItems.length === 0) {
    return (
      <EmptyState icon={<BowlFoodIcon size={24} aria-hidden />} title="The menu is being prepared">
        There is nothing to order yet. Ask your waiter for help in the meantime.
      </EmptyState>
    )
  }

  const spacing = densitySpacing(layout.density)
  const stickyTop = belowFixedBar ? 'top-20' : 'top-0'
  const scrollMargin = belowFixedBar ? 'scroll-mt-32' : 'scroll-mt-16'
  const section = (category: MenuCategory): ReactNode => (
    <section key={category.id} id={sectionId(category.id)} className={`${scrollMargin} space-y-4`}>
      <CategoryHeading name={category.name} style={layout.category_header} />
      <Products category={category} layout={layout} onAdd={onAdd} />
    </section>
  )

  if (showsOneCategory(layout.navigation)) {
    const current = currentCategoryId(ids, chosen)
    const shown = withItems.find((category) => category.id === current) ?? withItems[0]
    const navProps = { categories: withItems, current, onPick: setChosen }
    if (layout.navigation === 'sidebar') {
      return (
        <div className="space-y-6 @3xl:grid @3xl:grid-cols-[12rem_minmax(0,1fr)] @3xl:items-start @3xl:gap-8 @3xl:space-y-0">
          <SidebarNav {...navProps} stickyTop={belowFixedBar ? 'top-20 @3xl:top-24' : 'top-0'} />
          {section(shown)}
        </div>
      )
    }
    return (
      <div className={spacing.sections}>
        <TabsNav {...navProps} stickyTop={stickyTop} />
        {section(shown)}
      </div>
    )
  }

  const navProps = { categories: withItems, current: activeSection, stickyTop }
  return (
    <div className={spacing.sections}>
      {layout.navigation === 'sections' ? <SectionsNav {...navProps} /> : <ChipsNav {...navProps} />}
      {withItems.map(section)}
    </div>
  )
}
