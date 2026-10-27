import { CookingPotIcon, KeyIcon, PencilSimpleIcon, PowerIcon, CallBellIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Button, IconButton } from '../../shared/ui/Button.tsx'
import { MOTION } from '../../shared/ui/classes.ts'
import { Select, TextInput } from '../../shared/ui/Field.tsx'
import { Badge, ErrorText, SuccessText } from '../../shared/ui/Feedback.tsx'
import type { StaffMember, StaffMemberChanges, StaffRole } from './api.ts'
import { ROLE_LABELS } from './labels.ts'

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
    void run(() => onResetPassword(mode.password), `Password updated. ${member.full_name} was signed out everywhere.`)
  }

  const RoleIcon = member.role === 'kitchen' ? CookingPotIcon : CallBellIcon

  return (
    <li className={`space-y-4 rounded-lg p-3 hover:bg-zinc-50 ${MOTION}`} aria-busy={busy}>
      {mode.kind === 'edit' ? (
        <form onSubmit={handleSaveEdit} className="flex flex-wrap items-center gap-2">
          <TextInput
            aria-label="Full name"
            required
            maxLength={120}
            autoFocus
            value={mode.full_name}
            onChange={(event) => setMode({ ...mode, full_name: event.target.value })}
            className="max-w-xs"
          />
          <Select
            aria-label="Role"
            value={mode.role}
            onChange={(event) => setMode({ ...mode, role: event.target.value as StaffRole })}
            className="max-w-40"
          >
            {Object.entries(ROLE_LABELS).map(([role, label]) => (
              <option key={role} value={role}>
                {label}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="primary" disabled={busy}>
            Save
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setMode({ kind: 'view' })}>
            Cancel
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${member.is_active ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-50 text-zinc-300'}`}>
            <RoleIcon size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`font-medium ${member.is_active ? 'text-zinc-950' : 'text-zinc-400'}`}>{member.full_name}</p>
              <Badge>{ROLE_LABELS[member.role]}</Badge>
              {!member.is_active && <Badge tone="warning">Inactive</Badge>}
            </div>
            <p className="text-sm text-zinc-500">@{member.username}</p>
          </div>
          <div className="flex items-center gap-1">
            <IconButton
              label="Edit name and role"
              icon={<PencilSimpleIcon size={16} />}
              disabled={busy}
              onClick={() => setMode({ kind: 'edit', full_name: member.full_name, role: member.role })}
            />
            <IconButton
              label="Set a new password"
              icon={<KeyIcon size={16} />}
              disabled={busy}
              onClick={() => setMode({ kind: 'password', password: '' })}
            />
            <IconButton
              label={member.is_active ? 'Deactivate' : 'Activate'}
              tone={member.is_active ? 'danger' : 'default'}
              icon={<PowerIcon size={16} />}
              disabled={busy}
              onClick={() => void run(() => onUpdate({ is_active: !member.is_active }))}
            />
          </div>
        </div>
      )}

      {mode.kind === 'password' && (
        <form onSubmit={handleSavePassword} className="flex flex-wrap items-center gap-2 rounded-xl bg-zinc-50 p-4">
          <TextInput
            type="password"
            aria-label="New password"
            placeholder="New password, at least 8 characters"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            autoFocus
            value={mode.password}
            onChange={(event) => setMode({ ...mode, password: event.target.value })}
            className="min-w-0 flex-1"
          />
          <Button type="submit" variant="primary" disabled={busy}>
            Save password
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setMode({ kind: 'view' })}>
            Cancel
          </Button>
        </form>
      )}

      {error && <ErrorText>{error}</ErrorText>}
      {notice && <SuccessText>{notice}</SuccessText>}
    </li>
  )
}
