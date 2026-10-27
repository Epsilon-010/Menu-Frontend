import { BowlFoodIcon } from '@phosphor-icons/react'
import { useAuth } from '../../features/auth/useAuth.ts'
import { useSessionHeartbeat } from '../../features/auth/useSessionHeartbeat.ts'
import { AppShell } from '../../shared/ui/AppShell.tsx'
import { EmptyState } from '../../shared/ui/Feedback.tsx'

/**
 * Table tablet home. The menu itself arrives in a later slice; for now it shows which table this
 * tablet is signed in as. There is no sign-out button: guests use this screen, and the admin
 * signs a tablet out by deactivating its table or generating a new PIN.
 */
export function MenuPage() {
  const { state } = useAuth()
  // Notices right away when the admin deactivates the table or regenerates its PIN.
  useSessionHeartbeat()

  if (state.status !== 'authenticated' || state.account.table === null) return null
  const { table, tenant } = state.account

  return (
    <AppShell business={tenant.name} identity={table.name}>
      <EmptyState icon={<BowlFoodIcon size={24} aria-hidden />} title={`Welcome to ${table.name}`}>
        The menu will appear here very soon. In the meantime, a waiter can help you with your order.
      </EmptyState>
    </AppShell>
  )
}
