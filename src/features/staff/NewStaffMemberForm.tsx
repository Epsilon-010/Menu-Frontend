import { PlusIcon } from '@phosphor-icons/react'
import { useId, useState, type FormEvent } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { Field, TextInput } from '../../shared/ui/Field.tsx'
import { ErrorText } from '../../shared/ui/Feedback.tsx'
import { Card } from '../../shared/ui/Section.tsx'
import type { NewStaffMember } from './api.ts'
import { RoleToggle } from './RoleToggle.tsx'
import { createDraftIds } from '../../shared/api/idempotency.ts'

const EMPTY: NewStaffMember = { full_name: '', role: 'waiter' }

/** What happened to a create: `clearForm` also starts a fresh draft (the member already exists). */
export type CreateOutcome = { error: null } | { error: string; clearForm: boolean }

interface NewStaffMemberFormProps {
  onCreate: (member: NewStaffMember) => Promise<CreateOutcome>
}

export function NewStaffMemberForm({ onCreate }: NewStaffMemberFormProps) {
  const [draft, setDraft] = useState<NewStaffMember>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const roleLabelId = useId()
  // Client ids for new members: a retry of the same data reuses its id, edited data gets a new one.
  // Names may repeat, so after a success the next member always gets a new id.
  const [drafts] = useState(() => createDraftIds())

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    const member = { full_name: draft.full_name.trim(), role: draft.role }
    const outcome = await onCreate({ ...member, id: drafts.idFor(JSON.stringify(member)) })
    setSaving(false)
    setError(outcome.error)
    if (outcome.error === null || outcome.clearForm) {
      setDraft(EMPTY)
      drafts.reset()
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-semibold text-ink">Agregar a alguien del personal</h2>
          <p className="text-sm text-muted">Recibes un código y un PIN para entregárselos. Con ellos inicia sesión.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo">
            <TextInput
              required
              maxLength={120}
              placeholder="Cocinero 1"
              autoComplete="off"
              value={draft.full_name}
              onChange={(event) => setDraft({ ...draft, full_name: event.target.value })}
            />
          </Field>
          <div className="space-y-2">
            <span id={roleLabelId} className="block text-sm font-medium text-ink-soft">
              Rol
            </span>
            <RoleToggle labelledBy={roleLabelId} value={draft.role} onChange={(role) => setDraft({ ...draft, role })} />
          </div>
        </div>
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" variant="primary" icon={<PlusIcon size={16} aria-hidden />} disabled={saving}>
          {saving ? 'Agregando…' : 'Agregar al personal'}
        </Button>
      </form>
    </Card>
  )
}
