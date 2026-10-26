import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onSessionEnded, refreshSession, type Role } from '../../shared/api/http.ts'
import { fetchAccount, login, logout, LoginError } from './api.ts'
import { AuthContext, type AuthContextValue, type AuthState } from './authContext.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  // On page load the access token is gone (memory only): recover the session from the cookie.
  useEffect(() => {
    let active = true
    refreshSession()
      .then((tokens) => (tokens ? fetchAccount() : null))
      .then((account) => {
        if (active) setState(account ? { status: 'authenticated', account } : { status: 'anonymous' })
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => onSessionEnded(() => setState({ status: 'anonymous' })), [])

  const signIn = useCallback(async (email: string, password: string): Promise<Role> => {
    const tokens = await login(email, password)
    const account = await fetchAccount()
    if (!account) throw new LoginError('unavailable')
    setState({ status: 'authenticated', account })
    return tokens.role
  }, [])

  const signOut = useCallback(async () => {
    await logout()
    setState({ status: 'anonymous' })
  }, [])

  const value = useMemo<AuthContextValue>(() => ({ state, signIn, signOut }), [state, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
