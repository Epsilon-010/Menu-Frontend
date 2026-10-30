/** The badges a product can show (the server's fixed list), in the order the menu shows them. */
export type Badge = 'new' | 'popular' | 'spicy' | 'vegan' | 'vegetarian' | 'gluten_free'

export const BADGES: Badge[] = ['new', 'popular', 'spicy', 'vegan', 'vegetarian', 'gluten_free']

export const BADGE_LABELS: Record<Badge, string> = {
  new: 'New',
  popular: 'Popular',
  spicy: 'Spicy',
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  gluten_free: 'Gluten-free',
}

/** The known badges of a product, once each and in order (an older server sends none). */
export function knownBadges(raw: unknown): Badge[] {
  if (!Array.isArray(raw)) return []
  return BADGES.filter((badge) => raw.includes(badge))
}
