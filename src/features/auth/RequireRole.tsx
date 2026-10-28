import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import type { Role } from '../../shared/api/http.ts'
import { Skeleton } from '../../shared/ui/Feedback.tsx'
import { accountRole, homePathFor } from './api.ts'
import { useAuth } from './useAuth.ts'
import { VisitEndedScreen } from './VisitEndedScreen.tsx'

interface RequireRoleProps {
  roles: Role[]
  children: ReactNode
}

/** Shaped like the signed-in layout (floating bar and a section) while the session loads. */
function SessionSkeleton() {
  return (
    <div role="status" aria-label="Loading your session" className="mx-auto max-w-5xl space-y-8 px-4 pt-4 sm:px-6">
      <Skeleton className="mx-auto h-12 w-72 rounded-2xl" />
      <div className="space-y-4 pt-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    </div>
  )
}

/** Renders its children only for the given roles; anonymous visitors go to /login, ended guests see why. */
export function RequireRole({ roles, children }: RequireRoleProps) {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') return <SessionSkeleton />
  if (state.status === 'visit-ended' && roles.includes('guest')) return <VisitEndedScreen reason={state.reason} />
  if (state.status === 'anonymous' || state.status === 'visit-ended') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  const role = accountRole(state.account)
  if (!roles.includes(role)) {
    return <Navigate to={homePathFor(role)} replace />
  }
  return children
}
