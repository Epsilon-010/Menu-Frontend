import { PlusIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { Field, Select, TextInput } from '../../shared/ui/Field.tsx'
import { ErrorText } from '../../shared/ui/Feedback.tsx'
import { Card } from '../../shared/ui/Section.tsx'
import type { NewStaffMember, StaffRole } from './api.ts'
import { ROLE_LABELS } from './labels.ts'

const EMPTY: NewStaffMember = { username: '', full_name: '', role: 'waiter', password: '' }

interface NewStaffMemberFormProps {
  /** Resolves to an error message, or null when the member was created. */
  onCreate: (member: NewStaffMember) => Promise<string | null>
}

export function NewStaffMemberForm({ onCreate }: NewStaffMemberFormProps) {
  const [draft, setDraft] = useState<NewStaffMember>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    const failure = await onCreate(draft)
    setSaving(false)
    setError(failure)
    if (failure === null) setDraft(EMPTY)
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h2 className="font-semibold text-zinc-950">Add a staff member</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <TextInput
              required
              maxLength={120}
              placeholder="Lucía Ramírez"
              value={draft.full_name}
              onChange={(event) => setDraft({ ...draft, full_name: event.target.value })}
            />
          </Field>
          <Field label="Username" hint="Letters, digits, dots, hyphens and underscores. They sign in with it.">
            <TextInput
              required
              minLength={3}
              maxLength={40}
              pattern="[A-Za-z0-9._\-]+"
              title="Letters, digits, dots, hyphens or underscores"
              autoCapitalize="none"
              spellCheck={false}
              autoComplete="off"
              placeholder="lucia.ramirez"
              value={draft.username}
              onChange={(event) => setDraft({ ...draft, username: event.target.value })}
            />
          </Field>
          <Field label="Role">
            <Select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as StaffRole })}>
              {Object.entries(ROLE_LABELS).map(([role, label]) => (
                <option key={role} value={role}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Password" hint="At least 8 characters.">
            <TextInput
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={draft.password}
              onChange={(event) => setDraft({ ...draft, password: event.target.value })}
            />
          </Field>
        </div>
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" variant="primary" icon={<PlusIcon size={16} aria-hidden />} disabled={saving}>
          {saving ? 'Adding…' : 'Add staff member'}
        </Button>
      </form>
    </Card>
  )
}
