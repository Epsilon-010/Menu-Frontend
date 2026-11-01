import { CrownSimpleIcon, DeviceTabletIcon, UserCircleIcon } from '@phosphor-icons/react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { accountRole, homePathFor, LoginError, type LoginFailure } from '../features/auth/api.ts'
import { useAuth } from '../features/auth/useAuth.ts'
import { normalizeStaffCode, STAFF_CODE_LENGTH, STAFF_PIN_LENGTH } from '../features/staff/credentials.ts'
import { LEGACY_PIN_LENGTH, PIN_LENGTH, TABLE_CODE_LENGTH } from '../features/tables/credentials.ts'
import type { Role } from '../shared/api/http.ts'
import { AuthLayout, AuthLogo } from '../shared/ui/AuthLayout.tsx'
import { buttonClass, MOTION } from '../shared/ui/classes.ts'
import { Field, TextInput } from '../shared/ui/Field.tsx'
import { ErrorText } from '../shared/ui/Feedback.tsx'

type Mode = 'admin' | 'staff' | 'table'

const TOO_MANY = 'Too many attempts. Wait a few minutes and try again.'
const OFFLINE = 'Could not reach the server. Check your connection and try again.'

const ERROR_MESSAGES: Record<Mode, Record<LoginFailure, string>> = {
  admin: {
    'invalid-credentials': 'That email and password do not match. Check them and try again.',
    'too-many-attempts': TOO_MANY,
    unavailable: OFFLINE,
  },
  staff: {
    'invalid-credentials': 'That code and PIN do not match. Ask your manager for a new PIN.',
    'too-many-attempts': TOO_MANY,
    unavailable: OFFLINE,
  },
  table: {
    'invalid-credentials': 'That table code and PIN do not match. Ask the manager for the current PIN.',
    'too-many-attempts': TOO_MANY,
    unavailable: OFFLINE,
  },
}

const INTROS: Record<Mode, string> = {
  admin: 'Managers sign in with the email and password of their business.',
  staff: 'Use the code and PIN your manager gave you.',
  table: 'Use the table code and PIN the manager created for this tablet.',
}

interface ModeTabProps {
  selected: boolean
  onSelect: () => void
  icon: ReactNode
  children: ReactNode
}

function ModeTab({ selected, onSelect, icon, children }: ModeTabProps) {
  const state = selected ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-950'
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${MOTION} ${state}`}
    >
      {icon}
      {children}
    </button>
  )
}

export function LoginPage() {
  const { state, signIn, signInTable } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('admin')
  // Admin: email and password. Staff: staff code and PIN. Table: table code and PIN.
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
      // Admins and staff share the sign in: the staff code goes where the admin's email goes.
      const role: Role = mode === 'table' ? await signInTable(account, secret) : await signIn(account.trim(), secret)
      navigate(homePathFor(role), { replace: true })
    } catch (caught) {
      setError(caught instanceof LoginError ? caught.reason : 'unavailable')
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <AuthLogo />
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">Sign in</h2>
          <p className="text-sm text-zinc-500">{INTROS[mode]}</p>
        </div>

        <div role="tablist" aria-label="Sign in as" className="flex gap-1 rounded-xl bg-zinc-100 p-1">
          <ModeTab
            selected={mode === 'admin'}
            onSelect={() => switchMode('admin')}
            icon={<CrownSimpleIcon size={16} aria-hidden />}
          >
            Admin
          </ModeTab>
          <ModeTab
            selected={mode === 'staff'}
            onSelect={() => switchMode('staff')}
            icon={<UserCircleIcon size={16} aria-hidden />}
          >
            Staff
          </ModeTab>
          <ModeTab
            selected={mode === 'table'}
            onSelect={() => switchMode('table')}
            icon={<DeviceTabletIcon size={16} aria-hidden />}
          >
            Table
          </ModeTab>
        </div>

        {mode === 'admin' && (
          <div className="space-y-4">
            <Field label="Email">
              <TextInput
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={account}
                onChange={(event) => setAccount(event.target.value)}
              />
            </Field>
            <Field label="Password">
              <TextInput
                type="password"
                autoComplete="current-password"
                required
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
              />
            </Field>
          </div>
        )}

        {mode === 'staff' && (
          <div className="space-y-4">
            {/* No length rules: accounts made before codes keep their old username and password until a new PIN. */}
            <Field label="Code" hint={`${STAFF_CODE_LENGTH} letters and digits.`}>
              <TextInput
                type="text"
                autoComplete="username"
                autoCapitalize="characters"
                spellCheck={false}
                required
                maxLength={40}
                value={account}
                onChange={(event) => setAccount(normalizeStaffCode(event.target.value))}
                className="font-mono tracking-widest"
              />
            </Field>
            <Field label="PIN" hint={`${STAFF_PIN_LENGTH} digits (${LEGACY_PIN_LENGTH} for a PIN given before).`}>
              <TextInput
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                required
                maxLength={128}
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                className="font-mono tracking-widest"
              />
            </Field>
          </div>
        )}

        {mode === 'table' && (
          <div className="space-y-4">
            <Field
              label="Table code"
              hint={`${TABLE_CODE_LENGTH} letters and digits, shown in the manager's table list.`}
            >
              <TextInput
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                required
                minLength={TABLE_CODE_LENGTH}
                maxLength={TABLE_CODE_LENGTH}
                value={account}
                onChange={(event) => setAccount(event.target.value.toUpperCase())}
                className="font-mono tracking-widest"
              />
            </Field>
            <Field label="PIN">
              <TextInput
                type="password"
                inputMode="numeric"
                autoComplete="off"
                required
                pattern={`\\d{${LEGACY_PIN_LENGTH}}|\\d{${PIN_LENGTH}}`}
                title={`${PIN_LENGTH} digits (${LEGACY_PIN_LENGTH} for a PIN given before)`}
                maxLength={PIN_LENGTH}
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                className="font-mono tracking-widest"
              />
            </Field>
          </div>
        )}

        {error && <ErrorText>{ERROR_MESSAGES[mode][error]}</ErrorText>}

        <button
          type="submit"
          disabled={submitting || state.status === 'loading'}
          className={`w-full ${buttonClass('primary', 'md')}`}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-center text-sm text-zinc-500">
          New here?{' '}
          <Link to="/register" className="font-medium text-zinc-950 underline underline-offset-4 hover:text-zinc-600">
            Create your business
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
