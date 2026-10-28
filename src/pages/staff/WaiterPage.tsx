import { CallBellIcon } from '@phosphor-icons/react'
import { EmptyState } from '../../shared/ui/Feedback.tsx'
import { StaffShell } from './StaffShell.tsx'

export function WaiterPage() {
  return (
    <StaffShell title="Waiter">
      <EmptyState icon={<CallBellIcon size={24} aria-hidden />} title="No dishes to deliver yet">
        Each order shows up here as a card the moment the kitchen marks a dish ready, with its table and what is still
        pending.
      </EmptyState>
    </StaffShell>
  )
}
