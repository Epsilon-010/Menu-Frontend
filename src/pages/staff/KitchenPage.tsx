import { StaffShell } from './StaffShell.tsx'

export function KitchenPage() {
  return (
    <StaffShell title="Kitchen">
      <p className="text-slate-600">No orders in the queue.</p>
    </StaffShell>
  )
}
