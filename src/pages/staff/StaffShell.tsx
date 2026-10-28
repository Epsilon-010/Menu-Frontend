import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../../features/auth/useAuth.ts'
import { useSessionHeartbeat } from '../../features/auth/useSessionHeartbeat.ts'
import { AppShell, type NavItem } from '../../shared/ui/AppShell.tsx'

interface StaffShellProps {
  title: string
  nav?: NavItem[]
  children: ReactNode
}

/** Layout of the waiter and kitchen screens: business, who is signed in, optional navigation and sign out. */
export function StaffShell({ title, nav, children }: StaffShellProps) {
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
    <AppShell
      business={tenant.name}
      identity={`${title} · ${user.full_name}`}
      nav={nav}
      onSignOut={() => void handleSignOut()}
      signingOut={signingOut}
    >
      {children}
    </AppShell>
  )
}
