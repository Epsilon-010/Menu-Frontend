import { QrCodeIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { accountRole, GUEST_NAME_MAX_LENGTH, homePathFor, QrJoinError } from '../features/auth/api.ts'
import { joinedWithQr } from '../features/auth/guestMarker.ts'
import { useAuth } from '../features/auth/useAuth.ts'
import { buttonClass } from '../shared/ui/classes.ts'
import { Field, TextInput } from '../shared/ui/Field.tsx'
import { ErrorText, Skeleton } from '../shared/ui/Feedback.tsx'

/** Where a guest lands after scanning the table's QR: an optional name and one button to join. */
export function JoinTablePage() {
  const { token = '' } = useParams()
  const { state, joinTable } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  // Only this table's guest goes straight to the menu; a guest of another table may join this one.
  if (state.status === 'authenticated' && accountRole(state.account) === 'guest' && joinedWithQr(token)) {
    return <Navigate to={homePathFor('guest')} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setJoining(true)
    setError(null)
    try {
      const role = await joinTable(token, name)
      navigate(homePathFor(role), { replace: true })
    } catch (caught) {
      setError(
        caught instanceof QrJoinError
          ? caught.message
          : 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      )
      setJoining(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white">
            <QrCodeIcon size={20} weight="bold" aria-hidden />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-balance text-zinc-950">Únete a tu mesa</h1>
          <p className="text-sm text-pretty text-zinc-500">
            Pide desde tu celular. Todos en la mesa comparten el mismo pedido y ven lo que agregan los demás.
          </p>
        </div>

        {state.status === 'loading' ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <Field label="Tu apodo (opcional)" hint="Aparece junto a lo que agregues">
            <TextInput
              type="text"
              autoComplete="given-name"
              maxLength={GUEST_NAME_MAX_LENGTH}
              placeholder="Comensal 1"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={joining}
            />
          </Field>
        )}

        {error && <ErrorText>{error}</ErrorText>}

        <button
          type="submit"
          disabled={joining || state.status === 'loading' || token === ''}
          className={`w-full ${buttonClass('primary', 'md')}`}
        >
          {joining ? 'Entrando…' : 'Unirme a la mesa'}
        </button>
      </form>
    </main>
  )
}
