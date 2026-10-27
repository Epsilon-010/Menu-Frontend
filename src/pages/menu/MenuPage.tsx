import { useAuth } from '../../features/auth/useAuth.ts'
import { useSessionHeartbeat } from '../../features/auth/useSessionHeartbeat.ts'

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
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">{tenant.name}</p>
        <h1 className="text-xl font-semibold text-slate-900">{table.name}</h1>
      </header>
      <main className="p-6">
        <p className="text-slate-600">The menu will appear here soon.</p>
      </main>
    </div>
  )
}
