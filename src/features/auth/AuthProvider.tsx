import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { onSessionEnded, type Role, type SessionInfo } from '../../shared/api/http.ts'
import { accountRole, fetchAccount, login, logout, LoginError, qrLogin, tableLogin } from './api.ts'
import { AuthContext, type AuthContextValue, type AuthState } from './authContext.ts'
import { hadGuestVisit, rememberGuestVisit } from './guestMarker.ts'

/** Where an ended session lands: a guest gets the visit-ended screen, everyone else the sign in. */
function endedState(): AuthState {
  return hadGuestVisit() ? { status: 'visit-ended', reason: 'ended' } : { status: 'anonymous' }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  // The role of the current session, read by the session-ended listener (which never re-subscribes).
  const roleRef = useRef<Role | null>(null)

  const authenticate = useCallback((account: AuthState & { status: 'authenticated' }) => {
    const role = accountRole(account.account)
    roleRef.current = role
    rememberGuestVisit(role === 'guest')
    setState(account)
  }, [])

  // On page load ask who we are: the cookies carry the session, and an expired access
  // cookie is renewed through the refresh cookie by apiFetch.
  useEffect(() => {
    let active = true
    fetchAccount()
      .catch(() => null)
      .then((account) => {
        if (!active) return
        if (account) authenticate({ status: 'authenticated', account })
        else setState(endedState())
      })
    return () => {
      active = false
    }
  }, [authenticate])

  useEffect(
    () =>
      onSessionEnded(() => {
        const wasGuest = roleRef.current === 'guest'
        roleRef.current = null
        setState(wasGuest ? { status: 'visit-ended', reason: 'ended' } : endedState())
      }),
    [],
  )

  const startSession = useCallback(
    async (session: Promise<SessionInfo>): Promise<Role> => {
      const { role } = await session
      const account = await fetchAccount()
      if (!account) throw new LoginError('unavailable')
      authenticate({ status: 'authenticated', account })
      return role
    },
    [authenticate],
  )

  const signIn = useCallback(
    (username: string, password: string) => startSession(login(username, password)),
    [startSession],
  )

  const signInTable = useCallback((code: string, pin: string) => startSession(tableLogin(code, pin)), [startSession])

  const joinTable = useCallback((token: string, name: string) => startSession(qrLogin(token, name)), [startSession])

  const signOut = useCallback(async () => {
    const wasGuest = roleRef.current === 'guest'
    try {
      await logout()
    } catch {
      // The local session ends anyway; the server-side session expires on its own.
    } finally {
      roleRef.current = null
      if (wasGuest) {
        setState({ status: 'visit-ended', reason: 'left' })
      } else {
        rememberGuestVisit(false)
        setState({ status: 'anonymous' })
      }
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ state, signIn, signInTable, joinTable, signOut }),
    [state, signIn, signInTable, joinTable, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
