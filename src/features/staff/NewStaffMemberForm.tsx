import { PlusIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { Field, Select, TextInput } from '../../shared/ui/Field.tsx'
import { ErrorText } from '../../shared/ui/Feedback.tsx'
import { Card } from '../../shared/ui/Section.tsx'
import type { NewStaffMember, StaffRole } from './api.ts'
import { ROLE_LABELS } from './labels.ts'
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
          <h2 className="font-semibold text-zinc-950">Add a staff member</h2>
          <p className="text-sm text-zinc-500">You get a code and a PIN to hand them. They sign in with those.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <TextInput
              required
              maxLength={120}
              placeholder="Cook 1"
              autoComplete="off"
              value={draft.full_name}
              onChange={(event) => setDraft({ ...draft, full_name: event.target.value })}
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
        </div>
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" variant="primary" icon={<PlusIcon size={16} aria-hidden />} disabled={saving}>
          {saving ? 'Adding…' : 'Add staff member'}
        </Button>
      </form>
    </Card>
  )
}
