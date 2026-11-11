import { CallBellIcon, CookingPotIcon, GearIcon } from '@phosphor-icons/react'
import { useAuth } from '../../features/auth/useAuth.ts'
import { KitchenBoard } from '../../features/kitchen/KitchenBoard.tsx'
import type { NavItem } from '../../shared/ui/AppShell.tsx'
import { StaffShell } from './StaffShell.tsx'

/** An admin can also run the kitchen: the way to the other screens. */
const ADMIN_NAV: NavItem[] = [
  { to: '/kitchen', label: 'Cocina', icon: <CookingPotIcon size={24} aria-hidden /> },
  { to: '/waiter', label: 'Servicio', icon: <CallBellIcon size={24} aria-hidden /> },
  { to: '/admin', label: 'Administración', icon: <GearIcon size={24} aria-hidden /> },
]

/** The rail has room for one short word under each icon. */
const ADMIN_RAIL: NavItem[] = ADMIN_NAV.map((item) => (item.to === '/admin' ? { ...item, label: 'Admin' } : item))

/** What staff without other screens see on the rail: only where they are. */
const OWN_RAIL: NavItem[] = [{ to: '/kitchen', label: 'Cocina', icon: <CookingPotIcon size={24} aria-hidden /> }]

export function KitchenPage() {
  const { state } = useAuth()
  const isAdmin = state.status === 'authenticated' && state.account.user?.role === 'admin'
  return (
    <StaffShell title="Cocina" nav={isAdmin ? ADMIN_NAV : undefined} rail={isAdmin ? ADMIN_RAIL : OWN_RAIL}>
      <KitchenBoard />
    </StaffShell>
  )
}
