import { BowlFoodIcon, MinusIcon, PlusIcon } from '@phosphor-icons/react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Button, IconButton } from '../../shared/ui/Button.tsx'
import { MOTION } from '../../shared/ui/classes.ts'
import { Field, TextInput } from '../../shared/ui/Field.tsx'
import { EmptyState, ErrorText } from '../../shared/ui/Feedback.tsx'
import { formatMoney } from '../catalog/price.ts'
import { BADGE_LABELS, type Badge } from '../catalog/badges.ts'
import type { BadgeShape, CardTemplate, CategoryHeader, ThemeCards, ThemeLayout } from '../theming/api.ts'
import {
  cardAspectClass,
  cardFitClass,
  cardImageClass,
  cardPaddingClass,
  cardShellClass,
  buttonShapeClass,
  cardTemplate,
  DEFAULT_CARDS,
  descriptionClampClass,
  pillShapeClass,
} from '../theming/cards.ts'
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

function Badges({ badges, shape }: { badges: Badge[]; shape: BadgeShape }) {
  if (badges.length === 0) return null
  return (
    <ul aria-label="Badges" className="flex flex-wrap gap-1">
      {badges.map((badge) => (
        <li key={badge} className={`${pillShapeClass(shape)} bg-badge px-2 py-0.5 text-xs font-semibold text-badge-ink`}>
          {BADGE_LABELS[badge]}
        </li>
      ))}
    </ul>
  )
}

interface AddButtonProps {
  name: string
  cards: ThemeCards
  onClick: () => void
}

function AddButton({ name, cards, onClick }: AddButtonProps) {
  const { style, shape } = cards.add_button
  return (
    <Button
      variant="secondary"
      icon={style === 'text' ? undefined : <PlusIcon size={16} aria-hidden />}
      aria-label={style === 'icon' ? `Add ${name}` : undefined}
      onClick={onClick}
      className={`type-button ${buttonShapeClass(shape)}`}
    >
      {style === 'icon' ? null : 'Add'}
    </Button>
  )
}

interface ItemCardProps {
  item: MenuItem
  onAdd: (quantity: number, note: string) => Promise<string | null>
  cards: ThemeCards
  template: CardTemplate
}

function ItemCard({ item, onAdd, cards, template }: ItemCardProps) {
  const [adding, setAdding] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const image = item.image?.card_url ?? null
  // Without an image the overlay template is a plain card: there is nothing to write over.
  const overlay = template === 'overlay' && image !== null
  const clamp = descriptionClampClass(cards.description_lines)
  const padding = cardPaddingClass(cards)

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

  const price = (
    <p className={`type-price shrink-0 tabular-nums ${overlay ? 'text-white' : 'text-price'}`}>{formatMoney(item.price_cents)}</p>
  )
  const text = (
    <div className="flex-1 space-y-2">
      <Badges badges={item.badges} shape={cards.badge_shape} />
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-4">
          <h3 className={`type-product-name flex-1 text-pretty ${overlay ? 'text-white' : 'text-ink'}`}>{item.name}</h3>
          {cards.price_position === 'top' && price}
        </div>
        {item.description && clamp && (
          <p className={`type-description ${clamp} text-pretty ${overlay ? 'text-white/85' : 'text-muted'}`}>{item.description}</p>
        )}
      </div>
    </div>
  )
  const button = <AddButton name={item.name} cards={cards} onClick={() => setAdding(true)} />
  const footer =
    cards.price_position === 'top' ? (
      button
    ) : (
      <div className="flex items-center justify-between gap-4">
        {price}
        {button}
      </div>
    )
  const form = (
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
  )
  const shell = `h-full overflow-hidden bg-surface ${cardShellClass(cards)}`

  if (overlay) {
    return (
      <article className={`flex flex-col ${shell}`}>
        {/* The image fills the card; the text sits at its foot over a dark scrim, and a long text grows the card. */}
        {/* One column as wide as the card (never as wide as the text), so long texts wrap inside it. */}
        <div className="relative grid flex-1 grid-cols-[minmax(0,1fr)]">
          <img src={image} alt={item.name} loading="lazy" className={`absolute inset-0 h-full w-full bg-subtle ${cardFitClass(cards)}`} />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent"
            style={{ opacity: cards.overlay_opacity / 100 }}
          />
          <div aria-hidden className={`[grid-area:1/1] w-full ${cardAspectClass(cards)}`} />
          <div className={`relative flex min-w-0 flex-col gap-4 self-end [grid-area:1/1] ${padding}`}>
            {text}
            {!adding && footer}
          </div>
        </div>
        {adding && <div className={padding}>{form}</div>}
      </article>
    )
  }

  const horizontal = template === 'horizontal'
  const direction = horizontal ? (cards.image.position === 'right' ? 'flex-row-reverse' : 'flex-row') : 'flex-col'
  return (
    <article className={`flex ${direction} ${shell}`}>
      {image && (
        <img
          src={image}
          alt={item.name}
          loading="lazy"
          className={horizontal ? `w-28 shrink-0 bg-subtle ${cardFitClass(cards)} @2xl:w-40` : `w-full bg-subtle ${cardImageClass(cards)}`}
        />
      )}
      <div className={`flex min-w-0 flex-1 flex-col gap-4 ${padding}`}>
        {text}
        {adding ? form : footer}
      </div>
    </article>
  )
}

interface MenuBrowserProps {
  categories: MenuCategory[]
  onAdd: (itemId: string, quantity: number, note: string) => Promise<string | null>
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
  cards: ThemeCards
  onAdd: MenuBrowserProps['onAdd']
}

function Products({ category, layout, cards, onAdd }: ProductsProps) {
  const { items: gap } = densitySpacing(layout.density)
  const template = cardTemplate(layout.product_view, cards.template)
  const card = (item: MenuItem) => (
    <ItemCard
      key={item.id}
      item={item}
      cards={cards}
      template={template}
      onAdd={(quantity, note) => onAdd(item.id, quantity, note)}
    />
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

/** A column of categories beside the products when the menu is wide enough; a scrolling row otherwise. */
function SidebarNav({ categories, current, onPick, stickyTop }: CategoryNavProps) {
  return (
    <nav
      aria-label="Menu categories"
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
