import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { homePathFor, LoginError, type LoginFailure } from '../features/auth/api.ts'
import { useAuth } from '../features/auth/useAuth.ts'

const ERROR_MESSAGES: Record<LoginFailure, string> = {
  'invalid-credentials': 'Invalid email or password.',
  'too-many-attempts': 'Too many attempts. Please try again in a few minutes.',
  unavailable: 'Could not reach the server. Please try again.',
}

export function LoginPage() {
  const { state, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<LoginFailure | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (state.status === 'authenticated') {
    return <Navigate to={homePathFor(state.account.user.role)} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const role = await signIn(email, password)
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

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {ERROR_MESSAGES[error]}
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
