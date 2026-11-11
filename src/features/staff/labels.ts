import type { StaffRole } from './api.ts'

export const ROLE_LABELS: Record<StaffRole, string> = {
  waiter: 'Mesero',
  kitchen: 'Cocina',
}

/** The tile behind each role icon in the staff list: full class names, so Tailwind finds them. */
export const ROLE_TILES: Record<StaffRole, string> = {
  waiter: 'bg-brand/10 text-brand',
  kitchen: 'bg-accent/15 text-accent',
}
