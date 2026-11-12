/** Sample products for the design preview: a business with an empty or tiny menu still sees how a full one looks. */
import type { Badge } from '../catalog/badges.ts'
import type { MenuCategory, MenuItem } from '../ordering/api.ts'

/** From this many products on, the preview shows the business's own menu. */
export const MIN_OWN_PRODUCTS = 6

/** A drawn picture (no files, no network): the dish as an emoji on a soft color, sized like a product photo. */
function picture(emoji: string, color: string): MenuItem['image'] {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">` +
    `<rect width="400" height="300" fill="${color}"/>` +
    `<text x="200" y="150" font-size="150" text-anchor="middle" dominant-baseline="central">${emoji}</text></svg>`
  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`
  return { thumbnail_url: url, card_url: url }
}

function sample(id: string, name: string, description: string, price_cents: number, emoji: string, color: string, badges: Badge[] = []): MenuItem {
  return { id: `sample-${id}`, name, description, price_cents, image: picture(emoji, color), badges, modifier_groups: [] }
}

const SAMPLE_MENU: MenuCategory[] = [
  {
    id: 'sample-mains',
    name: 'Platos fuertes',
    items: [
      sample('burger', 'Hamburguesa de la casa', 'Carne a la parrilla, queso y papas', 14900, '🍔', '#fde8cf', ['popular']),
      sample('tacos', 'Tacos al pastor', 'Tres tacos con piña, cebolla y cilantro', 9500, '🌮', '#fff1bf'),
      sample('pizza', 'Pizza margarita', 'Jitomate, mozzarella y albahaca', 18900, '🍕', '#ffdcd2', ['vegetarian']),
      sample('salad', 'Ensalada fresca', 'Hojas verdes, aguacate y aderezo de la casa', 11500, '🥗', '#dcf2dd', ['vegan']),
    ],
  },
  {
    id: 'sample-drinks',
    name: 'Bebidas',
    items: [
      sample('juice', 'Jugo de naranja', 'Recién exprimido, 400 ml', 4500, '🍊', '#ffe5c2'),
      sample('coffee', 'Café americano', 'Grano de altura, taza grande', 3800, '☕', '#eadfd3', ['new']),
    ],
  },
  {
    id: 'sample-desserts',
    name: 'Postres',
    items: [
      sample('cake', 'Pastel de chocolate', 'Rebanada con ganache', 7200, '🍰', '#f4dce6'),
      sample('ice-cream', 'Helado de vainilla', 'Dos bolas con fruta de temporada', 5600, '🍨', '#dceaf7'),
    ],
  },
]

/** The menu the preview draws: the business's own once it has enough products, sample products until then. */
export function previewMenu(menu: MenuCategory[]): { categories: MenuCategory[]; sample: boolean } {
  const own = menu.reduce((count, category) => count + category.items.length, 0)
  return own >= MIN_OWN_PRODUCTS ? { categories: menu, sample: false } : { categories: SAMPLE_MENU, sample: true }
}
