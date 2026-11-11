import { ChairIcon, CookingPotIcon, GearIcon } from '@phosphor-icons/react'
import { ServiceBoard } from '../../features/deliveries/ServiceBoard.tsx'
import { useAuth } from '../../features/auth/useAuth.ts'
import type { NavItem } from '../../shared/ui/AppShell.tsx'
import { StaffShell } from './StaffShell.tsx'

/** An admin also serves tables: the way back to the admin panel. */
const ADMIN_NAV: NavItem[] = [
  { to: '/waiter', label: 'Servicio', icon: <ChairIcon size={24} aria-hidden /> },
  { to: '/kitchen', label: 'Cocina', icon: <CookingPotIcon size={24} aria-hidden /> },
  { to: '/admin', label: 'Administración', icon: <GearIcon size={24} aria-hidden /> },
]

/** The rail has room for one short word under each icon. */
const ADMIN_RAIL: NavItem[] = ADMIN_NAV.map((item) => (item.to === '/admin' ? { ...item, label: 'Admin' } : item))

/** What staff without other screens see on the rail: only where they are. */
const OWN_RAIL: NavItem[] = [{ to: '/waiter', label: 'Servicio', icon: <ChairIcon size={24} aria-hidden /> }]

export function WaiterPage() {
  const { state } = useAuth()
  const isAdmin = state.status === 'authenticated' && state.account.user?.role === 'admin'
  return (
    <StaffShell title={isAdmin ? 'Servicio' : 'Mesero'} nav={isAdmin ? ADMIN_NAV : undefined} rail={isAdmin ? ADMIN_RAIL : OWN_RAIL}>
      <ServiceBoard />
    </StaffShell>
  )
}
