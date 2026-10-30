import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AddLineForm } from './AddLineForm.tsx'
import type { Cart, CartLine, MenuCategory, MenuItem, ModifierGroup, Order } from './api.ts'
import { CartContents } from './CartContents.tsx'
import { LineOptionsForm } from './LineOptionsForm.tsx'
import { ModifierPicker } from './ModifierPicker.tsx'
import { OrderCard } from './OrderCard.tsx'
import { SendConfirmation } from './SendConfirmation.tsx'

const SIZE: ModifierGroup = {
  id: 'size',
  name: 'Size',
  min_select: 1,
  max_select: 1,
  options: [
    { id: 'small', name: 'Small', price_cents: 0, available: true },
    { id: 'large', name: 'Large', price_cents: 1500, available: true },
    { id: 'huge', name: 'Huge', price_cents: 3000, available: false },
  ],
}

const EXTRAS: ModifierGroup = {
  id: 'extras',
  name: 'Extras',
  min_select: 0,
  max_select: 2,
  options: [
    { id: 'cheese', name: 'Cheese', price_cents: 1000, available: true },
    { id: 'avocado', name: 'Avocado', price_cents: 2000, available: true },
    { id: 'onion', name: 'Onion', price_cents: 0, available: true },
  ],
}

const TACO: MenuItem = {
  id: 'taco',
  name: 'Taco',
  description: '',
  price_cents: 2500,
  image: null,
  badges: [],
  modifier_groups: [SIZE, EXTRAS],
}

const PLAIN: MenuItem = { ...TACO, id: 'plain', name: 'Horchata', price_cents: 3000, modifier_groups: [] }

const noop = () => Promise.resolve(null)

function inputs(html: string, type: string): string[] {
  return [...html.matchAll(new RegExp(`<input[^>]*type="${type}"[^>]*>`, 'g'))].map((match) => match[0])
}

describe('the options picker', () => {
  it('shows a group of one as radios and a group of several as checkboxes', () => {
    const html = renderToStaticMarkup(<ModifierPicker groups={[SIZE, EXTRAS]} selected={[]} onChange={() => {}} />)

    expect(inputs(html, 'radio')).toHaveLength(3)
    expect(inputs(html, 'checkbox')).toHaveLength(3)
    expect(html).toContain('Size')
    expect(html).toContain('Choose 1')
    expect(html).toContain('Optional, up to 2')
  })

  it('labels paid options with their price and free ones with none', () => {
    const html = renderToStaticMarkup(<ModifierPicker groups={[SIZE]} selected={[]} onChange={() => {}} />)

    expect(html).toContain('+$15.00')
    expect(html).not.toContain('+$0.00')
  })

  it('disables sold out options and says so', () => {
    const html = renderToStaticMarkup(<ModifierPicker groups={[SIZE]} selected={[]} onChange={() => {}} />)
    const [small, , huge] = inputs(html, 'radio')

    expect(html).toContain('Sold out')
    expect(huge).toContain('disabled')
    expect(small).not.toContain('disabled')
    expect(html).not.toContain('+$30.00')
  })

  it('blocks more checkboxes once the group is full', () => {
    const html = renderToStaticMarkup(
      <ModifierPicker groups={[EXTRAS]} selected={['cheese', 'avocado']} onChange={() => {}} />,
    )
    const [cheese, avocado, onion] = inputs(html, 'checkbox')

    expect(cheese).toContain('checked')
    expect(avocado).toContain('checked')
    expect(onion).toContain('disabled')
    expect(cheese).not.toContain('disabled')
  })

  it('uses the theme colours of the menu, never fixed ones', () => {
    const html = renderToStaticMarkup(<ModifierPicker groups={[SIZE, EXTRAS]} selected={['large']} onChange={() => {}} />)

    expect(html).not.toMatch(/(zinc|gray|slate|neutral|stone)-\d/)
  })
})

describe('the add form of a menu card', () => {
  it('asks for the options first and shows the rule that is not met yet', () => {
    const html = renderToStaticMarkup(<AddLineForm item={TACO} onAdd={noop} onDone={() => {}} />)
    const submit = /<button type="submit"[^>]*>/.exec(html)?.[0] ?? ''

    expect(html).toContain('Choose 1 option for Size')
    expect(submit).toContain('disabled=""')
    expect(html).toContain('Add 1 · $25.00')
  })

  it('shows the live total with the chosen options', () => {
    const html = renderToStaticMarkup(
      <AddLineForm item={TACO} onAdd={noop} onDone={() => {}} initialSelection={['large', 'cheese']} />,
    )
    const submit = /<button type="submit"[^>]*>/.exec(html)?.[0] ?? ''

    expect(html).toContain('Add 1 · $50.00')
    expect(submit).not.toContain('disabled=""')
    expect(html).not.toContain('Choose 1 option for Size')
  })

  it('keeps an item without options as it was: no picker, the item price', () => {
    const html = renderToStaticMarkup(<AddLineForm item={PLAIN} onAdd={noop} onDone={() => {}} />)
    const submit = /<button type="submit"[^>]*>/.exec(html)?.[0] ?? ''

    expect(html).not.toContain('<fieldset')
    expect(html).toContain('Add 1 · $30.00')
    expect(html).toContain('Note for the kitchen (optional)')
    expect(submit).not.toContain('disabled=""')
  })
})

function line(changes: Partial<CartLine> = {}): CartLine {
  return {
    id: 'l1',
    item_id: 'taco',
    name: 'Taco',
    quantity: 1,
    note: '',
    added_by: 'Guest 1',
    available: true,
    unit_price_cents: 5000,
    subtotal_cents: 5000,
    modifiers: [
      { option_id: 'large', group: 'Size', name: 'Large', price_cents: 1500 },
      { option_id: 'cheese', group: 'Extras', name: 'Cheese', price_cents: 1000 },
    ],
    ...changes,
  }
}

const MENU: MenuCategory[] = [{ id: 'c1', name: 'Tacos', items: [TACO, PLAIN] }]

function cart(lines: CartLine[]): Cart {
  return { version: 1, lines, total_cents: lines.reduce((sum, each) => sum + each.subtotal_cents, 0) }
}

function renderCart(lines: CartLine[], menu: MenuCategory[] = MENU): string {
  return renderToStaticMarkup(
    <CartContents cart={cart(lines)} menu={menu} onChange={noop} onRemove={noop} onSend={() => {}} />,
  )
}

describe('a cart line with options', () => {
  it('lists the options under the name and offers to edit them', () => {
    const html = renderCart([line()])

    expect(html).toContain('Size: Large · Extras: Cheese')
    expect(html).toContain('Edit options')
  })

  it('does not offer editing when the item is no longer on the menu', () => {
    const html = renderCart([line()], [])

    expect(html).toContain('Size: Large · Extras: Cheese')
    expect(html).not.toContain('Edit options')
  })

  it('keeps a line without options as it was', () => {
    const html = renderCart([line({ id: 'l2', item_id: 'plain', name: 'Horchata', modifiers: [] })])

    expect(html).toContain('Horchata')
    expect(html).not.toContain('Edit options')
    expect(html).not.toContain('Size:')
  })

  it('reopens the picker with the current options, keeping only those still on sale', () => {
    const current = line({
      modifiers: [
        { option_id: 'huge', group: 'Size', name: 'Huge', price_cents: 3000 },
        { option_id: 'cheese', group: 'Extras', name: 'Cheese', price_cents: 1000 },
      ],
    })
    const html = renderToStaticMarkup(<LineOptionsForm item={TACO} line={current} onSave={noop} onClose={() => {}} />)
    const [cheese] = inputs(html, 'checkbox')
    const submit = /<button type="submit"[^>]*>/.exec(html)?.[0] ?? ''

    expect(cheese).toContain('checked')
    expect(inputs(html, 'radio').some((input) => input.includes('checked'))).toBe(false)
    expect(html).toContain('Choose 1 option for Size')
    expect(submit).toContain('disabled=""')
  })
})

const ORDER: Order = {
  id: 'o1',
  number: 7,
  status: 'queued',
  sent_by: 'Guest 1',
  created_at: '2026-10-30T12:00:00Z',
  total_cents: 5000,
  items: [
    {
      id: 'd1',
      item_id: 'taco',
      name: 'Taco',
      quantity: 1,
      note: '',
      added_by: 'Guest 1',
      status: 'queued',
      cancel_reason: null,
      unit_price_cents: 5000,
      subtotal_cents: 5000,
      modifiers: [
        { group: 'Size', name: 'Large', price_cents: 1500 },
        { group: 'Extras', name: 'Cheese', price_cents: 1000 },
        { group: 'Extras', name: 'Onion', price_cents: 0 },
      ],
    },
  ],
}

describe('sent orders and the send summary', () => {
  it('list the options of each dish, with their prices when prices show', () => {
    const priced = renderToStaticMarkup(<OrderCard order={ORDER} />)
    const plain = renderToStaticMarkup(<OrderCard order={ORDER} showPrices={false} />)

    expect(priced).toContain('Size: Large (+$15.00) · Extras: Cheese (+$10.00), Onion')
    expect(plain).toContain('Size: Large · Extras: Cheese, Onion')
    expect(plain).not.toContain('+$')
  })

  it('show the options in the review before sending', () => {
    const html = renderToStaticMarkup(
      <SendConfirmation liveCart={cart([line()])} onSend={() => Promise.resolve({ kind: 'failed', message: '' })} onSent={() => {}} onClose={() => {}} />,
    )

    expect(html).toContain('Size: Large · Extras: Cheese')
  })
})
