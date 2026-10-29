import { BowlFoodIcon, CallBellIcon, ChairIcon, CookingPotIcon, PaletteIcon, TimerIcon, UsersThreeIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { useAuth } from '../../features/auth/useAuth.ts'
import { AppShell, type NavItem } from '../../shared/ui/AppShell.tsx'

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Menu', icon: <BowlFoodIcon size={16} aria-hidden />, end: true },
  { to: '/admin/tables', label: 'Tables', icon: <ChairIcon size={16} aria-hidden /> },
  { to: '/admin/staff', label: 'Staff', icon: <UsersThreeIcon size={16} aria-hidden /> },
  { to: '/admin/settings', label: 'Orders', icon: <TimerIcon size={16} aria-hidden /> },
  { to: '/admin/design', label: 'Design', icon: <PaletteIcon size={16} aria-hidden /> },
  // The waiter's tables view: open tables, follow their orders and take payments.
  { to: '/waiter', label: 'Service', icon: <CallBellIcon size={16} aria-hidden /> },
  { to: '/kitchen', label: 'Kitchen', icon: <CookingPotIcon size={16} aria-hidden /> },
]

/** Admin layout: the floating navigation and the selected section. */
export function AdminPage() {
  const { state, signOut } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

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
      identity={user.full_name}
      nav={ADMIN_NAV}
      onSignOut={() => void handleSignOut()}
      signingOut={signingOut}
    >
      <Outlet />
    </AppShell>
  )
}
