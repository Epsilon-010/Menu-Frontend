import { StaffShell } from './StaffShell.tsx'

export function WaiterPage() {
  return (
    <StaffShell title="Waiter">
      <p className="text-slate-600">No orders yet.</p>
    </StaffShell>
  )
}
