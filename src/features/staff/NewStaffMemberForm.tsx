import { useState, type FormEvent } from 'react'
import type { NewStaffMember, StaffRole } from './api.ts'
import { ROLE_LABELS } from './labels.ts'

const EMPTY: NewStaffMember = { username: '', full_name: '', role: 'waiter', password: '' }
const INPUT = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none'

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
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-medium text-slate-900">Add a staff member</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm text-slate-700">Full name</span>
          <input
            required
            maxLength={120}
            value={draft.full_name}
            onChange={(event) => setDraft({ ...draft, full_name: event.target.value })}
            className={INPUT}
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-slate-700">Username</span>
          <input
            required
            minLength={3}
            maxLength={40}
            pattern="[A-Za-z0-9._\-]+"
            title="Letters, digits, dots, hyphens or underscores"
            autoCapitalize="none"
            spellCheck={false}
            autoComplete="off"
            value={draft.username}
            onChange={(event) => setDraft({ ...draft, username: event.target.value })}
            className={INPUT}
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-slate-700">Role</span>
          <select
            value={draft.role}
            onChange={(event) => setDraft({ ...draft, role: event.target.value as StaffRole })}
            className={INPUT}
          >
            {Object.entries(ROLE_LABELS).map(([role, label]) => (
              <option key={role} value={role}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm text-slate-700">Password</span>
          <input
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            value={draft.password}
            onChange={(event) => setDraft({ ...draft, password: event.target.value })}
            className={INPUT}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {saving ? 'Adding…' : 'Add'}
      </button>
    </form>
  )
}
