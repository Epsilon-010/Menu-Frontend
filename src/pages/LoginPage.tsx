import { DeviceTabletIcon, ForkKnifeIcon, UserCircleIcon } from '@phosphor-icons/react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { accountRole, homePathFor, LoginError, type LoginFailure } from '../features/auth/api.ts'
import { useAuth } from '../features/auth/useAuth.ts'
import type { Role } from '../shared/api/http.ts'
import { buttonClass, MOTION } from '../shared/ui/classes.ts'
import { Field, TextInput } from '../shared/ui/Field.tsx'
import { ErrorText } from '../shared/ui/Feedback.tsx'

type Mode = 'staff' | 'table'

const ERROR_MESSAGES: Record<Mode, Record<LoginFailure, string>> = {
  staff: {
    'invalid-credentials': 'That username and password do not match. Check them and try again.',
    'too-many-attempts': 'Too many attempts. Wait a few minutes and try again.',
    unavailable: 'Could not reach the server. Check your connection and try again.',
  },
  table: {
    'invalid-credentials': 'That table code and PIN do not match. Ask the manager for the current PIN.',
    'too-many-attempts': 'Too many attempts. Wait a few minutes and try again.',
    unavailable: 'Could not reach the server. Check your connection and try again.',
  },
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
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-[#181818] p-12 text-white lg:flex">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-950">
          <ForkKnifeIcon size={20} weight="bold" aria-hidden />
        </span>
        <div className="max-w-[680px] space-y-4">
          <h1 className="bg-gradient-to-r from-white to-[#9B9B9B] bg-clip-text text-5xl font-semibold tracking-tight text-transparent">
            Every table orders on its own.
            <br />
            The kitchen hears it at once.
          </h1>
          <p className="max-w-[680px] text-lg text-zinc-400">
            Guests build their order from the tablet, the kitchen releases each dish when it is ready and the waiter
            brings it to the right table.
          </p>
        </div>
        <p className="text-sm text-zinc-500">Menu for restaurants</p>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-6">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white lg:hidden">
              <ForkKnifeIcon size={20} weight="bold" aria-hidden />
            </span>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">Sign in</h2>
            <p className="text-sm text-zinc-500">
              {mode === 'staff'
                ? 'Managers use their email; waiters and cooks use the username the manager gave them.'
                : 'Use the table code and PIN the manager created for this tablet.'}
            </p>
          </div>

          <div role="tablist" aria-label="Sign in as" className="flex gap-1 rounded-xl bg-zinc-100 p-1">
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

          {mode === 'staff' ? (
            <div className="space-y-4">
              <Field label="Username or email">
                <TextInput
                  type="text"
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
          ) : (
            <div className="space-y-4">
              <Field label="Table code" hint="Six letters and digits, shown in the manager's table list.">
                <TextInput
                  type="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  required
                  minLength={6}
                  maxLength={6}
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
                  pattern="\d{6}"
                  title="Six digits"
                  maxLength={6}
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
        </form>
      </section>
    </main>
  )
}
