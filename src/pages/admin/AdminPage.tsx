import { BowlFoodIcon, CallBellIcon, ChairIcon, ChartBarIcon, CookingPotIcon, PaletteIcon, ShieldCheckIcon, SlidersHorizontalIcon, TimerIcon, UserCircleIcon, UsersThreeIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../features/auth/useAuth.ts'
import { AppShell, type NavItem } from '../../shared/ui/AppShell.tsx'
import { AdminWelcome } from './AdminWelcome.tsx'

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Menú', icon: <BowlFoodIcon size={16} aria-hidden />, end: true },
  { to: '/admin/modifiers', label: 'Opciones y extras', icon: <SlidersHorizontalIcon size={16} aria-hidden /> },
  { to: '/admin/tables', label: 'Mesas', icon: <ChairIcon size={16} aria-hidden /> },
  { to: '/admin/staff', label: 'Personal', icon: <UsersThreeIcon size={16} aria-hidden /> },
  { to: '/admin/admins', label: 'Administradores', icon: <ShieldCheckIcon size={16} aria-hidden /> },
  { to: '/admin/settings', label: 'Órdenes', icon: <TimerIcon size={16} aria-hidden /> },
  { to: '/admin/design', label: 'Diseño', icon: <PaletteIcon size={16} aria-hidden /> },
  { to: '/admin/stats', label: 'Estadísticas', icon: <ChartBarIcon size={16} aria-hidden /> },
  { to: '/admin/account', label: 'Cuenta', icon: <UserCircleIcon size={16} aria-hidden /> },
  // The waiter's tables view: open tables, follow their orders and take payments.
  { to: '/waiter', label: 'Servicio', icon: <CallBellIcon size={16} aria-hidden /> },
  { to: '/kitchen', label: 'Cocina', icon: <CookingPotIcon size={16} aria-hidden /> },
]

/** Admin layout: the floating navigation and the selected section. */
export function AdminPage() {
  const { state, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
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
      // The design editor puts its sections, preview and options side by side.
      width={pathname === '/admin/design' ? 'max-w-7xl' : undefined}
    >
      {pathname === '/admin' && <AdminWelcome name={user.full_name} business={tenant.name} />}
      {/* Keyed by the path: each section plays its entrance when it opens. */}
      <div key={pathname} className="motion-safe:animate-card-rise">
        <Outlet />
      </div>
    </AppShell>
  )
}
