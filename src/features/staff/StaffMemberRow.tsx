import { CookingPotIcon, KeyIcon, PencilSimpleIcon, PowerIcon, CallBellIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Button, IconButton } from '../../shared/ui/Button.tsx'
import { MOTION } from '../../shared/ui/classes.ts'
import { Select, TextInput } from '../../shared/ui/Field.tsx'
import { Badge, ErrorText } from '../../shared/ui/Feedback.tsx'
import { useRowAction } from '../../shared/ui/useRowAction.ts'
import type { StaffMember, StaffMemberChanges, StaffRole } from './api.ts'
import { normalizeStaffCode } from './credentials.ts'
import { ROLE_LABELS } from './labels.ts'

type Mode = { kind: 'view' } | { kind: 'edit'; full_name: string; role: StaffRole } | { kind: 'confirm-pin' }

interface StaffMemberRowProps {
  member: StaffMember
  /** Resolve to an error message, or null on success. */
  onUpdate: (changes: StaffMemberChanges) => Promise<string | null>
  /** The panel shows the new credentials once. */
  onRegeneratePin: () => Promise<string | null>
}

export function StaffMemberRow({ member, onUpdate, onRegeneratePin }: StaffMemberRowProps) {
  const [mode, setMode] = useState<Mode>({ kind: 'view' })
  const { busy, error, run: runAction } = useRowAction()

  function run(action: () => Promise<string | null>) {
    return runAction(action, () => setMode({ kind: 'view' }))
  }

  function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode.kind !== 'edit') return
    void run(() => onUpdate({ full_name: mode.full_name, role: mode.role }))
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
            <p className="text-sm text-zinc-500">
              Code <span className="font-mono tracking-widest text-zinc-700">{normalizeStaffCode(member.code)}</span>
            </p>
          </div>
          <div className="flex items-center gap-1">
            <IconButton
              label="Edit name and role"
              icon={<PencilSimpleIcon size={16} />}
              disabled={busy}
              onClick={() => setMode({ kind: 'edit', full_name: member.full_name, role: member.role })}
            />
            <IconButton
              label="Generate a new PIN"
              icon={<KeyIcon size={16} />}
              disabled={busy}
              onClick={() => setMode({ kind: 'confirm-pin' })}
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

      {mode.kind === 'confirm-pin' && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl bg-amber-50 p-4">
          <p className="flex-1 text-sm text-amber-900">
            {member.full_name} signs out of every device right away and will need the new PIN. The code stays the same.
          </p>
          <div className="flex gap-2">
            <Button variant="primary" disabled={busy} onClick={() => void run(onRegeneratePin)}>
              Generate new PIN
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setMode({ kind: 'view' })}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && <ErrorText>{error}</ErrorText>}
    </li>
  )
}
