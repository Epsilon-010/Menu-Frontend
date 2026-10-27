import { CookingPotIcon } from '@phosphor-icons/react'
import { EmptyState } from '../../shared/ui/Feedback.tsx'
import { StaffShell } from './StaffShell.tsx'

export function KitchenPage() {
  return (
    <StaffShell title="Kitchen">
      <EmptyState icon={<CookingPotIcon size={24} aria-hidden />} title="The queue is empty">
        New orders arrive here as soon as a table sends them, oldest first. You choose which dishes to start.
      </EmptyState>
    </StaffShell>
  )
}
