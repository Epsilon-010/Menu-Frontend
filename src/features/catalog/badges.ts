/** The badges a product can show (the server's fixed list), in the order the menu shows them. */
export type Badge = 'new' | 'popular' | 'spicy' | 'vegan' | 'vegetarian' | 'gluten_free'

export const BADGES: Badge[] = ['new', 'popular', 'spicy', 'vegan', 'vegetarian', 'gluten_free']

export const BADGE_LABELS: Record<Badge, string> = {
  new: 'Nuevo',
  popular: 'Popular',
  spicy: 'Picante',
  vegan: 'Vegano',
  vegetarian: 'Vegetariano',
  gluten_free: 'Sin gluten',
}

/** The known badges of a product, once each and in order (an older server sends none). */
export function knownBadges(raw: unknown): Badge[] {
  if (!Array.isArray(raw)) return []
  return BADGES.filter((badge) => raw.includes(badge))
}
