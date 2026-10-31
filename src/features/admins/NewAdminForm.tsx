import { PlusIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { createDraftIds } from '../../shared/api/idempotency.ts'
import { Button } from '../../shared/ui/Button.tsx'
import { Field, TextInput } from '../../shared/ui/Field.tsx'
import { ErrorText } from '../../shared/ui/Feedback.tsx'
import { Card } from '../../shared/ui/Section.tsx'
import type { NewAdmin } from './api.ts'

const EMPTY: NewAdmin = { full_name: '', email: '' }

/** What happened to a create: `clearForm` also starts a fresh draft (the admin already exists). */
export type CreateOutcome = { error: null } | { error: string; clearForm: boolean }

interface NewAdminFormProps {
  onCreate: (admin: NewAdmin) => Promise<CreateOutcome>
}

export function NewAdminForm({ onCreate }: NewAdminFormProps) {
  const [draft, setDraft] = useState<NewAdmin>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // A retry of the same data reuses its id, so a lost answer never makes a second admin.
  const [drafts] = useState(() => createDraftIds())

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    const admin = { full_name: draft.full_name.trim(), email: draft.email.trim() }
    const outcome = await onCreate({ ...admin, id: drafts.idFor(JSON.stringify(admin)) })
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
          <h2 className="font-semibold text-zinc-950">Add an admin</h2>
          <p className="text-sm text-zinc-500">
            You get a temporary password to hand them. They sign in with their email and must pick their own password.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <TextInput
              required
              maxLength={120}
              placeholder="Manager"
              autoComplete="off"
              value={draft.full_name}
              onChange={(event) => setDraft({ ...draft, full_name: event.target.value })}
            />
          </Field>
          <Field label="Email">
            <TextInput
              required
              type="email"
              maxLength={254}
              placeholder="manager@example.com"
              autoComplete="off"
              value={draft.email}
              onChange={(event) => setDraft({ ...draft, email: event.target.value })}
            />
          </Field>
        </div>
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" variant="primary" icon={<PlusIcon size={16} aria-hidden />} disabled={saving}>
          {saving ? 'Adding…' : 'Add admin'}
        </Button>
      </form>
    </Card>
  )
}
