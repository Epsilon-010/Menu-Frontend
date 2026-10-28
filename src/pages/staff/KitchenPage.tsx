import { CallBellIcon, CookingPotIcon, GearIcon } from '@phosphor-icons/react'
import { useAuth } from '../../features/auth/useAuth.ts'
import { KitchenBoard } from '../../features/kitchen/KitchenBoard.tsx'
import type { NavItem } from '../../shared/ui/AppShell.tsx'
import { StaffShell } from './StaffShell.tsx'

/** An admin can also run the kitchen: the way to the other screens. */
const ADMIN_NAV: NavItem[] = [
  { to: '/kitchen', label: 'Kitchen', icon: <CookingPotIcon size={16} aria-hidden /> },
  { to: '/waiter', label: 'Service', icon: <CallBellIcon size={16} aria-hidden /> },
  { to: '/admin', label: 'Admin', icon: <GearIcon size={16} aria-hidden /> },
]

export function KitchenPage() {
  const { state } = useAuth()
  const isAdmin = state.status === 'authenticated' && state.account.user?.role === 'admin'
  return (
    <StaffShell title="Kitchen" nav={isAdmin ? ADMIN_NAV : undefined}>
      <KitchenBoard />
    </StaffShell>
  )
}
