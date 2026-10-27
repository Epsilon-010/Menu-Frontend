import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../../features/auth/useAuth.ts'
import { useSessionHeartbeat } from '../../features/auth/useSessionHeartbeat.ts'

interface StaffShellProps {
  title: string
  children: ReactNode
}

/** Layout of the waiter and kitchen screens: business, who is signed in and sign out. */
export function StaffShell({ title, children }: StaffShellProps) {
  const { state, signOut } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  useSessionHeartbeat()

  if (state.status !== 'authenticated' || state.account.user === null) return null
  const { user, tenant } = state.account

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {title} · {tenant.name}
          </p>
          <h1 className="text-xl font-semibold text-slate-900">{user.full_name}</h1>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          Sign out
        </button>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
