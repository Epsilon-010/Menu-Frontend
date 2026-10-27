import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../../features/auth/useAuth.ts'
import { StaffPanel } from '../../features/staff/StaffPanel.tsx'

export function AdminPage() {
  const { state, signOut } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  if (state.status !== 'authenticated') return null
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
          <p className="text-xs uppercase tracking-wide text-slate-500">Admin panel</p>
          <h1 className="text-xl font-semibold text-slate-900">{tenant.name}</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">{user.full_name}</span>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-6">
        <StaffPanel />
      </main>
    </div>
  )
}
