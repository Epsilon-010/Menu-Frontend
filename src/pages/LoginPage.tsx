import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { accountRole, homePathFor, LoginError, type LoginFailure } from '../features/auth/api.ts'
import { useAuth } from '../features/auth/useAuth.ts'
import type { Role } from '../shared/api/http.ts'

type Mode = 'staff' | 'table'

const ERROR_MESSAGES: Record<Mode, Record<LoginFailure, string>> = {
  staff: {
    'invalid-credentials': 'Invalid username or password.',
    'too-many-attempts': 'Too many attempts. Please try again in a few minutes.',
    unavailable: 'Could not reach the server. Please try again.',
  },
  table: {
    'invalid-credentials': 'Invalid table code or PIN.',
    'too-many-attempts': 'Too many attempts. Please try again in a few minutes.',
    unavailable: 'Could not reach the server. Please try again.',
  },
}

const INPUT = 'w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none'

function tabClass(selected: boolean): string {
  return selected
    ? 'flex-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-900 shadow-sm'
    : 'flex-1 rounded-md px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900'
}

export function LoginPage() {
  const { state, signIn, signInTable } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('staff')
  // Staff: username (or the admin's email) and password. Table: table code and PIN.
  const [account, setAccount] = useState('')
  const [secret, setSecret] = useState('')
  const [error, setError] = useState<LoginFailure | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (state.status === 'authenticated') {
    return <Navigate to={homePathFor(accountRole(state.account))} replace />
  }

  function switchMode(next: Mode) {
    setMode(next)
    setAccount('')
    setSecret('')
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const role: Role = mode === 'staff' ? await signIn(account, secret) : await signInTable(account, secret)
      navigate(homePathFor(role), { replace: true })
    } catch (caught) {
      setError(caught instanceof LoginError ? caught.reason : 'unavailable')
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>

        <div role="tablist" aria-label="Sign in as" className="flex gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'staff'}
            onClick={() => switchMode('staff')}
            className={tabClass(mode === 'staff')}
          >
            Staff
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'table'}
            onClick={() => switchMode('table')}
            className={tabClass(mode === 'table')}
          >
            Table
          </button>
        </div>

        {mode === 'staff' ? (
          <>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Username or email</span>
              <input
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={account}
                onChange={(event) => setAccount(event.target.value)}
                className={INPUT}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                className={INPUT}
              />
            </label>
          </>
        ) : (
          <>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Table code</span>
              <input
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                required
                maxLength={6}
                value={account}
                onChange={(event) => setAccount(event.target.value.toUpperCase())}
                className={`${INPUT} font-mono tracking-widest`}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">PIN</span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                required
                maxLength={6}
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                className={`${INPUT} font-mono tracking-widest`}
              />
            </label>
          </>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {ERROR_MESSAGES[mode][error]}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || state.status === 'loading'}
          className="w-full rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
