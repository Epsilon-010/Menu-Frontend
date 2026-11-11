import { useAuth } from '../../features/auth/useAuth.ts'
import { KitchenBoard } from '../../features/kitchen/KitchenBoard.tsx'
import { ADMIN_STAFF_NAV, ADMIN_STAFF_RAIL, KITCHEN_RAIL } from './staffNav.tsx'
import { StaffShell } from './StaffShell.tsx'

export function KitchenPage() {
  const { state } = useAuth()
  const isAdmin = state.status === 'authenticated' && state.account.user?.role === 'admin'
  return (
    <StaffShell title="Cocina" nav={isAdmin ? ADMIN_STAFF_NAV : undefined} rail={isAdmin ? ADMIN_STAFF_RAIL : KITCHEN_RAIL}>
      <KitchenBoard />
    </StaffShell>
  )
}
