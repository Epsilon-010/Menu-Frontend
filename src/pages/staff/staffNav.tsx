import { CallBellIcon, CookingPotIcon, GearIcon } from '@phosphor-icons/react'
import type { NavItem } from '../../shared/ui/AppShell.tsx'

const SERVICE: NavItem = { to: '/waiter', label: 'Servicio', icon: <CallBellIcon size={24} aria-hidden /> }
const KITCHEN: NavItem = { to: '/kitchen', label: 'Cocina', icon: <CookingPotIcon size={24} aria-hidden /> }

/** An admin also serves tables and runs the kitchen: both screens and the way back to the admin panel. */
export const ADMIN_STAFF_NAV: NavItem[] = [
  SERVICE,
  KITCHEN,
  { to: '/admin', label: 'Administración', icon: <GearIcon size={24} aria-hidden /> },
]

/** The same screens for the icon rail, which has room for one short word under each icon. */
export const ADMIN_STAFF_RAIL: NavItem[] = ADMIN_STAFF_NAV.map((item) => (item.to === '/admin' ? { ...item, label: 'Admin' } : item))

/** What staff with a single screen see on the rail: only where they are. */
export const WAITER_RAIL: NavItem[] = [SERVICE]
export const KITCHEN_RAIL: NavItem[] = [KITCHEN]
