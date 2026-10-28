import { ChairIcon, CookingPotIcon, GearIcon } from '@phosphor-icons/react'
import { ServiceBoard } from '../../features/deliveries/ServiceBoard.tsx'
import { useAuth } from '../../features/auth/useAuth.ts'
import type { NavItem } from '../../shared/ui/AppShell.tsx'
import { StaffShell } from './StaffShell.tsx'

/** An admin also serves tables: the way back to the admin panel. */
const ADMIN_NAV: NavItem[] = [
  { to: '/waiter', label: 'Service', icon: <ChairIcon size={16} aria-hidden /> },
  { to: '/kitchen', label: 'Kitchen', icon: <CookingPotIcon size={16} aria-hidden /> },
  { to: '/admin', label: 'Admin', icon: <GearIcon size={16} aria-hidden /> },
]

export function WaiterPage() {
  const { state } = useAuth()
  const isAdmin = state.status === 'authenticated' && state.account.user?.role === 'admin'
  return (
    <StaffShell title={isAdmin ? 'Service' : 'Waiter'} nav={isAdmin ? ADMIN_NAV : undefined}>
      <ServiceBoard />
    </StaffShell>
  )
}
