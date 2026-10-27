import { useState, type FormEvent } from 'react'
import type { StaffMember, StaffMemberChanges, StaffRole } from './api.ts'
import { ROLE_LABELS } from './labels.ts'

const INPUT = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none'
const BUTTON = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50'

type Mode = { kind: 'view' } | { kind: 'edit'; full_name: string; role: StaffRole } | { kind: 'password'; password: string }

interface StaffMemberRowProps {
  member: StaffMember
  /** Resolve to an error message, or null on success. */
  onUpdate: (changes: StaffMemberChanges) => Promise<string | null>
  onResetPassword: (password: string) => Promise<string | null>
}

export function StaffMemberRow({ member, onUpdate, onResetPassword }: StaffMemberRowProps) {
  const [mode, setMode] = useState<Mode>({ kind: 'view' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function run(action: () => Promise<string | null>, done: string | null = null) {
    setBusy(true)
    setNotice(null)
    const failure = await action()
    setBusy(false)
    setError(failure)
    if (failure === null) {
      setMode({ kind: 'view' })
      setNotice(done)
    }
  }

  function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode.kind !== 'edit') return
    void run(() => onUpdate({ full_name: mode.full_name, role: mode.role }))
  }

  function handleSavePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode.kind !== 'password') return
    void run(() => onResetPassword(mode.password), 'Password updated. They were signed out everywhere.')
  }

  return (
    <li className="space-y-2 p-4">
      {mode.kind === 'edit' ? (
        <form onSubmit={handleSaveEdit} className="flex flex-wrap items-center gap-2">
          <input
            aria-label="Full name"
            required
            maxLength={120}
            value={mode.full_name}
            onChange={(event) => setMode({ ...mode, full_name: event.target.value })}
            className={INPUT}
          />
          <select
            aria-label="Role"
            value={mode.role}
            onChange={(event) => setMode({ ...mode, role: event.target.value as StaffRole })}
            className={INPUT}
          >
            {Object.entries(ROLE_LABELS).map(([role, label]) => (
              <option key={role} value={role}>
                {label}
              </option>
            ))}
          </select>
          <button type="submit" disabled={busy} className={BUTTON}>
            Save
          </button>
          <button type="button" disabled={busy} onClick={() => setMode({ kind: 'view' })} className={BUTTON}>
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={member.is_active ? 'font-medium text-slate-900' : 'font-medium text-slate-400 line-through'}>
              {member.full_name}
            </p>
            <p className="text-sm text-slate-500">
              @{member.username} · {ROLE_LABELS[member.role]}
              {!member.is_active && ' · Inactive'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode({ kind: 'edit', full_name: member.full_name, role: member.role })}
              className={BUTTON}
            >
              Edit
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode({ kind: 'password', password: '' })}
              className={BUTTON}
            >
              Reset password
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => onUpdate({ is_active: !member.is_active }))}
              className={BUTTON}
            >
              {member.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      )}

      {mode.kind === 'password' && (
        <form onSubmit={handleSavePassword} className="flex flex-wrap items-center gap-2">
          <input
            type="password"
            aria-label="New password"
            placeholder="New password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            value={mode.password}
            onChange={(event) => setMode({ ...mode, password: event.target.value })}
            className={INPUT}
          />
          <button type="submit" disabled={busy} className={BUTTON}>
            Save password
          </button>
          <button type="button" disabled={busy} onClick={() => setMode({ kind: 'view' })} className={BUTTON}>
            Cancel
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {notice && <p className="text-sm text-emerald-700">{notice}</p>}
    </li>
  )
}
