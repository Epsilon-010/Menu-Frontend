import { createContext } from 'react'
import type { Role } from '../../shared/api/http.ts'
import type { Account } from './api.ts'
import type { SignUp } from './register.ts'

/** Why a guest's visit is over: the table was paid or got a new QR, or the guest left. */
export type VisitEndReason = 'ended' | 'left'

export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; account: Account }
  /** A guest's session ended: they see a closing screen, never the staff sign in form. */
  | { status: 'visit-ended'; reason: VisitEndReason }

export interface AuthContextValue {
  state: AuthState
  /** Signs in and returns the role so the caller can redirect. Throws LoginError. */
  signIn: (username: string, password: string) => Promise<Role>
  /** Signs a tablet in as its table. Throws LoginError. */
  signInTable: (code: string, pin: string) => Promise<Role>
  /** Joins a table's open visit with its QR token. Throws QrJoinError (or LoginError when the account cannot load). */
  joinTable: (token: string, name: string) => Promise<Role>
  /**
   * Creates the business and its admin, then loads the new session. Throws RegisterError, or
   * LoginError('unavailable') when the account was created but could not be loaded.
   */
  register: (signUp: SignUp) => Promise<Role>
  /** Replaces the admin's password and reloads the account. Throws PasswordChangeError. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
