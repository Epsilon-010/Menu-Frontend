import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onSessionEnded, type Role } from '../../shared/api/http.ts'
import { fetchAccount, login, logout, LoginError } from './api.ts'
import { AuthContext, type AuthContextValue, type AuthState } from './authContext.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  // On page load ask who we are: the cookies carry the session, and an expired access
  // cookie is renewed through the refresh cookie by apiFetch.
  useEffect(() => {
    let active = true
    fetchAccount()
      .catch(() => null)
      .then((account) => {
        if (active) setState(account ? { status: 'authenticated', account } : { status: 'anonymous' })
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => onSessionEnded(() => setState({ status: 'anonymous' })), [])

  const signIn = useCallback(async (email: string, password: string): Promise<Role> => {
    const session = await login(email, password)
    const account = await fetchAccount()
    if (!account) throw new LoginError('unavailable')
    setState({ status: 'authenticated', account })
    return session.role
  }, [])

  const signOut = useCallback(async () => {
    try {
      await logout()
    } catch {
      // The local session ends anyway; the server-side session expires on its own.
    } finally {
      setState({ status: 'anonymous' })
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({ state, signIn, signOut }), [state, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
