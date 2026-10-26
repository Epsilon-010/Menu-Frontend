import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import type { Role } from '../../shared/api/http.ts'
import { homePathFor } from './api.ts'
import { useAuth } from './useAuth.ts'

interface RequireRoleProps {
  roles: Role[]
  children: ReactNode
}

/** Renders its children only for the given roles; anonymous visitors go to /login. */
export function RequireRole({ roles, children }: RequireRoleProps) {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') {
    return <p className="p-6 text-sm text-slate-500">Loading…</p>
  }
  if (state.status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  const role = state.account.user.role
  if (!roles.includes(role)) {
    return <Navigate to={homePathFor(role)} replace />
  }
  return children
}
