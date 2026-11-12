import { PlusIcon } from '@phosphor-icons/react'
import { Fragment, useState, type ReactNode } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { formatMoney } from '../catalog/price.ts'
import { BADGE_LABELS, type Badge } from '../catalog/badges.ts'
import type { BadgeShape, CardBlock, CardTemplate, ThemeCards } from '../theming/api.ts'
import {
  badgeShapeClass,
  buttonShapeClass,
  cardAspectClass,
  cardFitClass,
  cardImageClass,
  cardPaddingClass,
  cardShellClass,
  descriptionClampClass,
} from '../theming/cards.ts'
import { ProductDialog } from './ProductDialog.tsx'
import type { MenuItem } from './api.ts'

function Badges({ badges, shape }: { badges: Badge[]; shape: BadgeShape }) {
  if (badges.length === 0) return null
  return (
    <ul aria-label="Etiquetas" className="flex flex-wrap gap-1">
      {badges.map((badge) => (
        <li key={badge} className={`${badgeShapeClass(shape)} bg-badge px-2 py-0.5 text-xs font-semibold text-badge-ink`}>
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
      variant="primary"
      icon={style === 'text' ? undefined : <PlusIcon size={16} aria-hidden />}
      aria-label={style === 'icon' ? `Agregar ${name}` : undefined}
      onClick={onClick}
      className={`type-button ${buttonShapeClass(shape)}`}
    >
      {style === 'icon' ? null : 'Agregar'}
    </Button>
  )
}

type TextBlock = Exclude<CardBlock, 'image' | 'add_button'>

/**
 * The blocks of one stretch of the card (between the image and the edges), in the theme's order, as children of a
 * `gap-4` column: runs of text blocks share one column (the name and a description right below it stay close
 * together), and the add button (or its form) sits between them.
 */
function arrange(blocks: CardBlock[], text: Record<TextBlock, ReactNode>, button: ReactNode): ReactNode[] {
  const children: ReactNode[] = []
  let run: ReactNode[] = []
  const closeRun = () => {
    if (run.length > 0) {
      children.push(
        <div key={`text-${children.length}`} className="flex-1 space-y-2">
          {run}
        </div>,
      )
    }
    run = []
  }
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]
    if (block === 'image') continue
    if (block === 'add_button') {
      closeRun()
      if (button) children.push(<Fragment key="add_button">{button}</Fragment>)
      continue
    }
    if (block === 'heading' && blocks[index + 1] === 'description') {
      run.push(
        <div key="heading" className="space-y-1">
          {text.heading}
          {text.description}
        </div>,
      )
      index += 1
      continue
    }
    run.push(<Fragment key={block}>{text[block]}</Fragment>)
  }
  closeRun()
  return children
}

interface ProductCardProps {
  item: MenuItem
  onAdd: (quantity: number, note: string, optionIds: string[]) => Promise<string | null>
  cards: ThemeCards
  /** The template this card is drawn with (the category's own, or the general one; list rows are horizontal). */
  template: CardTemplate
}

/** One product of the menu, its parts in the order the theme sets, with its add form. */
export function ProductCard({ item, onAdd, cards, template }: ProductCardProps) {
  const [adding, setAdding] = useState(false)
  const image = item.image?.card_url ?? null
  // Without an image the overlay template is a plain card: there is nothing to write over.
  const overlay = template === 'overlay' && image !== null
  const clamp = descriptionClampClass(cards.description_lines)
  const padding = cardPaddingClass(cards)
  const priceBesideName = cards.price_position === 'top'

  const price = (
    <p className={`type-price shrink-0 tabular-nums ${overlay ? 'text-white' : 'text-price'}`}>{formatMoney(item.price_cents)}</p>
  )
  const text: Record<TextBlock, ReactNode> = {
    heading: (
      <div className="card-heading flex items-start justify-between gap-4">
        <h3 className={`type-product-name flex-1 text-pretty ${overlay ? 'text-white' : 'text-ink'}`}>{item.name}</h3>
        {priceBesideName && price}
      </div>
    ),
    description:
      item.description && clamp ? (
        <p className={`type-description ${clamp} text-pretty ${overlay ? 'text-white/85' : 'text-muted'}`}>{item.description}</p>
      ) : null,
    badges: <Badges badges={item.badges} shape={cards.badge_shape} />,
  }
  const button = <AddButton name={item.name} cards={cards} onClick={() => setAdding(true)} />
  const footer = priceBesideName ? (
    button
  ) : (
    <div className="card-footer flex items-center justify-between gap-4">
      {price}
      {button}
    </div>
  )
  // Options, quantity and note are chosen in a window over the menu, so the card never changes size.
  const dialog = <ProductDialog item={item} open={adding} onOpenChange={setAdding} onAdd={onAdd} />
  // `card-*` names are hooks for the two-column phone grid (see `.phone-duo` in index.css).
  const shell = `h-full overflow-hidden bg-surface ${cardShellClass(cards)}`
  // Parts with nothing to show (no description, no badges) are skipped, so the name and the next text stay together.
  const empty = (block: CardBlock) =>
    (block === 'description' && text.description === null) || (block === 'badges' && item.badges.length === 0)
  const blocks = cards.blocks.filter((block) => !empty(block))

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
          <div className={`relative flex min-w-0 flex-col gap-4 self-end [grid-area:1/1] card-body ${padding}`}>
            {arrange(blocks, text, footer)}
          </div>
        </div>
        {dialog}
      </article>
    )
  }

  const segment = (part: CardBlock[], key: string, grow: boolean) =>
    part.some((block) => block !== 'image') ? (
      <div key={key} className={['flex min-w-0', grow && 'flex-1', 'flex-col gap-4 card-body', padding].filter(Boolean).join(' ')}>
        {arrange(part, text, footer)}
      </div>
    ) : null

  if (template === 'horizontal') {
    const direction = cards.image.position === 'right' ? 'flex-row-reverse' : 'flex-row'
    return (
      <article className={`flex ${direction} ${shell}`}>
        {image && <img src={image} alt={item.name} loading="lazy" className={`w-28 shrink-0 bg-subtle ${cardFitClass(cards)} @2xl:w-40`} />}
        {segment(blocks, 'body', true)}
        {dialog}
      </article>
    )
  }

  // Vertical: the image is one more block, full width between the padded stretches above and below it.
  // Without an image the card is one padded stretch.
  const at = image ? blocks.indexOf('image') : -1
  const before = at < 0 ? [] : blocks.slice(0, at)
  const after = blocks.slice(at + 1)
  return (
    <article className={`flex flex-col ${shell}`}>
      {segment(before, 'before', after.length === 0)}
      {image && <img src={image} alt={item.name} loading="lazy" className={`w-full bg-subtle ${cardImageClass(cards)}`} />}
      {segment(after, 'after', true)}
      {dialog}
    </article>
  )
}
