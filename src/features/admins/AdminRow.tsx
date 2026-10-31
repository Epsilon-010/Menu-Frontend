import { PencilSimpleIcon, PowerIcon, ShieldCheckIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Button, IconButton } from '../../shared/ui/Button.tsx'
import { MOTION } from '../../shared/ui/classes.ts'
import { TextInput } from '../../shared/ui/Field.tsx'
import { Badge, ErrorText } from '../../shared/ui/Feedback.tsx'
import { useRowAction } from '../../shared/ui/useRowAction.ts'
import type { AdminAccount, AdminChanges } from './api.ts'

type Mode = { kind: 'view' } | { kind: 'edit'; full_name: string } | { kind: 'confirm-deactivate' }

interface AdminRowProps {
  admin: AdminAccount
  /** The signed-in admin's own row: it cannot be deactivated. */
  isYou: boolean
  /** Resolve to an error message, or null on success. */
  onUpdate: (changes: AdminChanges) => Promise<string | null>
}

export function AdminRow({ admin, isYou, onUpdate }: AdminRowProps) {
  const [mode, setMode] = useState<Mode>({ kind: 'view' })
  const { busy, error, run: runAction } = useRowAction()

  function run(action: () => Promise<string | null>) {
    return runAction(action, () => setMode({ kind: 'view' }))
  }

  function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode.kind !== 'edit') return
    void run(() => onUpdate({ full_name: mode.full_name }))
  }

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
          <Button type="submit" variant="primary" disabled={busy}>
            Save
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setMode({ kind: 'view' })}>
            Cancel
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${admin.is_active ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-50 text-zinc-300'}`}
          >
            <ShieldCheckIcon size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`font-medium ${admin.is_active ? 'text-zinc-950' : 'text-zinc-400'}`}>{admin.full_name}</p>
              {isYou && <Badge>You</Badge>}
              {admin.must_change_password && <Badge tone="warning">Temporary password</Badge>}
              {!admin.is_active && <Badge tone="warning">Inactive</Badge>}
            </div>
            <p className="truncate text-sm text-zinc-500">{admin.email}</p>
          </div>
          <div className="flex items-center gap-1">
            <IconButton
              label="Edit name"
              icon={<PencilSimpleIcon size={16} />}
              disabled={busy}
              onClick={() => setMode({ kind: 'edit', full_name: admin.full_name })}
            />
            {!isYou && (
              <IconButton
                label={admin.is_active ? 'Deactivate' : 'Activate'}
                tone={admin.is_active ? 'danger' : 'default'}
                icon={<PowerIcon size={16} />}
                disabled={busy}
                onClick={() =>
                  admin.is_active ? setMode({ kind: 'confirm-deactivate' }) : void run(() => onUpdate({ is_active: true }))
                }
              />
            )}
          </div>
        </div>
      )}

      {mode.kind === 'confirm-deactivate' && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl bg-amber-50 p-4">
          <p className="flex-1 text-sm text-amber-900">
            {admin.full_name} signs out of every device right away and can no longer sign in until reactivated.
          </p>
          <div className="flex gap-2">
            <Button variant="primary" disabled={busy} onClick={() => void run(() => onUpdate({ is_active: false }))}>
              Deactivate
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
