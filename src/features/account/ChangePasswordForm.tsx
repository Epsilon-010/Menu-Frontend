import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/useAuth.ts'
import { Button } from '../../shared/ui/Button.tsx'
import { Field, TextInput } from '../../shared/ui/Field.tsx'
import { ErrorText, SuccessText } from '../../shared/ui/Feedback.tsx'
import { PasswordChangeError } from './api.ts'
import { MAX_PASSWORD_LENGTH, passwordProblem, type PasswordDraft } from './passwordForm.ts'

const EMPTY: PasswordDraft = { current: '', next: '', repeat: '' }

interface ChangePasswordFormProps {
  /** Label of the current password field: "Temporary password" on the forced screen. */
  currentLabel?: string
  submitLabel?: string
}

/** Current, new and repeated password. On success every other device is signed out; this one stays. */
export function ChangePasswordForm({ currentLabel = 'Contraseña actual', submitLabel = 'Cambiar contraseña' }: ChangePasswordFormProps) {
  const { changePassword } = useAuth()
  const [draft, setDraft] = useState<PasswordDraft>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setDone(false)
    const problem = passwordProblem(draft)
    setError(problem)
    if (problem) return
    setSaving(true)
    try {
      await changePassword(draft.current, draft.next)
      setDraft(EMPTY)
      setDone(true)
    } catch (caught) {
      setError(
        caught instanceof PasswordChangeError
          ? caught.message
          : 'Tu contraseña cambió, pero esta página no se pudo actualizar. Recárgala para continuar.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label={currentLabel}>
        <TextInput
          type="password"
          required
          autoComplete="current-password"
          maxLength={200}
          value={draft.current}
          onChange={(event) => setDraft({ ...draft, current: event.target.value })}
        />
      </Field>
      <Field label="Nueva contraseña" hint="Al menos 8 caracteres.">
        <TextInput
          type="password"
          required
          autoComplete="new-password"
          maxLength={MAX_PASSWORD_LENGTH}
          value={draft.next}
          onChange={(event) => setDraft({ ...draft, next: event.target.value })}
        />
      </Field>
      <Field label="Repite la nueva contraseña">
        <TextInput
          type="password"
          required
          autoComplete="new-password"
          maxLength={MAX_PASSWORD_LENGTH}
          value={draft.repeat}
          onChange={(event) => setDraft({ ...draft, repeat: event.target.value })}
        />
      </Field>
      {error && <ErrorText>{error}</ErrorText>}
      {done && <SuccessText>Contraseña cambiada. Se cerró la sesión en tus otros dispositivos.</SuccessText>}
      <Button type="submit" variant="primary" disabled={saving}>
        {saving ? 'Guardando…' : submitLabel}
      </Button>
    </form>
  )
}
