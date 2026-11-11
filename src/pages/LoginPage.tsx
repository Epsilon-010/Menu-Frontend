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

const TOO_MANY = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
const OFFLINE = 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'

const ERROR_MESSAGES: Record<Mode, Record<LoginFailure, string>> = {
  admin: {
    'invalid-credentials': 'Ese correo y esa contraseña no coinciden. Revísalos e inténtalo de nuevo.',
    'too-many-attempts': TOO_MANY,
    unavailable: OFFLINE,
  },
  staff: {
    'invalid-credentials': 'Ese código y ese PIN no coinciden. Pide un PIN nuevo al administrador.',
    'too-many-attempts': TOO_MANY,
    unavailable: OFFLINE,
  },
  table: {
    'invalid-credentials': 'Ese código de mesa y ese PIN no coinciden. Pide el PIN actual al administrador.',
    'too-many-attempts': TOO_MANY,
    unavailable: OFFLINE,
  },
}

const INTROS: Record<Mode, string> = {
  admin: 'Los administradores inician sesión con el correo y la contraseña de su negocio.',
  staff: 'Usa el código y el PIN que te dio el administrador.',
  table: 'Usa el código de mesa y el PIN que el administrador creó para esta tablet.',
}

interface ModeTabProps {
  selected: boolean
  onSelect: () => void
  icon: ReactNode
  children: ReactNode
}

function ModeTab({ selected, onSelect, icon, children }: ModeTabProps) {
  const state = selected ? 'bg-brand text-brand-ink shadow-md shadow-brand/30' : 'text-muted hover:bg-surface hover:text-ink'
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${MOTION} ${state}`}
    >
      {/* The three tabs only fit a narrow phone without their icons. */}
      <span className="hidden sm:inline-flex">{icon}</span>
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
          <h2 className="text-4xl font-semibold tracking-tight text-ink">Iniciar sesión</h2>
          <p className="text-sm text-muted">{INTROS[mode]}</p>
        </div>

        <div role="tablist" aria-label="Iniciar sesión como" className="flex gap-1 rounded-xl bg-subtle p-1">
          <ModeTab
            selected={mode === 'admin'}
            onSelect={() => switchMode('admin')}
            icon={<CrownSimpleIcon size={16} aria-hidden />}
          >
            Administrador
          </ModeTab>
          <ModeTab
            selected={mode === 'staff'}
            onSelect={() => switchMode('staff')}
            icon={<UserCircleIcon size={16} aria-hidden />}
          >
            Personal
          </ModeTab>
          <ModeTab
            selected={mode === 'table'}
            onSelect={() => switchMode('table')}
            icon={<DeviceTabletIcon size={16} aria-hidden />}
          >
            Mesa
          </ModeTab>
        </div>

        {mode === 'admin' && (
          <div className="space-y-4">
            <Field label="Correo electrónico">
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
            <Field label="Contraseña">
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
            <Field label="Código" hint={`${STAFF_CODE_LENGTH} letras y dígitos.`}>
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
            <Field label="PIN" hint={`${STAFF_PIN_LENGTH} dígitos (${LEGACY_PIN_LENGTH} para un PIN anterior).`}>
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
              label="Código de mesa"
              hint={`${TABLE_CODE_LENGTH} letras y dígitos; aparece en la lista de mesas del administrador.`}
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
                title={`${PIN_LENGTH} dígitos (${LEGACY_PIN_LENGTH} para un PIN anterior)`}
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
          className={`w-full rounded-xl py-3 shadow-lg shadow-brand/30 ${buttonClass('primary', 'md')}`}
        >
          {submitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
        </button>

        <p className="text-center text-sm text-muted">
          ¿Eres nuevo?{' '}
          <Link to="/register" className="font-semibold text-brand underline underline-offset-4 hover:text-action-hover">
            Crea tu negocio
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
