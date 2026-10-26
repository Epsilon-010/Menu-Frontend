import { createContext } from 'react'
import type { Role } from '../../shared/api/http.ts'
import type { Account } from './api.ts'

export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; account: Account }

export interface AuthContextValue {
  state: AuthState
  /** Signs in and returns the role so the caller can redirect. Throws LoginError. */
  signIn: (email: string, password: string) => Promise<Role>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
