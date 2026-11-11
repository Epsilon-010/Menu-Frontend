import { ServiceBoard } from '../../features/deliveries/ServiceBoard.tsx'
import { useAuth } from '../../features/auth/useAuth.ts'
import { ADMIN_STAFF_NAV, ADMIN_STAFF_RAIL, WAITER_RAIL } from './staffNav.tsx'
import { StaffShell } from './StaffShell.tsx'

export function WaiterPage() {
  const { state } = useAuth()
  const isAdmin = state.status === 'authenticated' && state.account.user?.role === 'admin'
  return (
    <StaffShell title={isAdmin ? 'Servicio' : 'Mesero'} nav={isAdmin ? ADMIN_STAFF_NAV : undefined} rail={isAdmin ? ADMIN_STAFF_RAIL : WAITER_RAIL}>
      <ServiceBoard />
    </StaffShell>
  )
}
