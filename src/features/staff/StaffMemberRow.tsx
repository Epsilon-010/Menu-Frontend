import { CookingPotIcon, KeyIcon, PencilSimpleIcon, PowerIcon, CallBellIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { DropdownMenuItem, DropdownMenuSeparator } from '../../components/ui/dropdown-menu.tsx'
import { Button } from '../../shared/ui/Button.tsx'
import { MOTION } from '../../shared/ui/classes.ts'
import { TextInput } from '../../shared/ui/Field.tsx'
import { Badge, ErrorText } from '../../shared/ui/Feedback.tsx'
import { useRowAction } from '../../shared/ui/useRowAction.ts'
import { ConfirmDialog, MoreActionsMenu, TooltipIconButton } from '../../shared/ui/RowActions.tsx'
import type { StaffMember, StaffMemberChanges, StaffRole } from './api.ts'
import { normalizeStaffCode } from './credentials.ts'
import { ROLE_LABELS, ROLE_TILES } from './labels.ts'
import { RoleToggle } from './RoleToggle.tsx'

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
    <li className={`space-y-4 rounded-lg p-3 hover:bg-canvas ${MOTION}`} aria-busy={busy}>
      {mode.kind === 'edit' ? (
        <form onSubmit={handleSaveEdit} className="flex flex-wrap items-center gap-2">
          <TextInput
            aria-label="Nombre completo"
            required
            maxLength={120}
            autoFocus
            value={mode.full_name}
            onChange={(event) => setMode({ ...mode, full_name: event.target.value })}
            className="max-w-xs"
          />
          <RoleToggle value={mode.role} onChange={(role) => setMode({ ...mode, role })} />
          <Button type="submit" variant="primary" disabled={busy}>
            Guardar
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setMode({ kind: 'view' })}>
            Cancelar
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${member.is_active ? ROLE_TILES[member.role] : 'bg-canvas text-line-strong'}`}>
            <RoleIcon size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`font-medium ${member.is_active ? 'text-ink' : 'text-faint'}`}>{member.full_name}</p>
              <Badge>{ROLE_LABELS[member.role]}</Badge>
              {!member.is_active && <Badge tone="warning">Inactivo</Badge>}
            </div>
            <p className="text-sm text-muted">
              Código <span className="font-mono tracking-widest text-ink-soft">{normalizeStaffCode(member.code)}</span>
            </p>
          </div>
          <div className="flex items-center gap-1">
            <TooltipIconButton
              label="Editar nombre y rol"
              icon={<PencilSimpleIcon size={16} aria-hidden />}
              disabled={busy}
              onClick={() => setMode({ kind: 'edit', full_name: member.full_name, role: member.role })}
            />
            <MoreActionsMenu label={`Más acciones de ${member.full_name}`} disabled={busy}>
              <DropdownMenuItem onSelect={() => setMode({ kind: 'confirm-pin' })}>
                <KeyIcon size={16} aria-hidden />
                Generar un nuevo PIN
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                tone={member.is_active ? 'danger' : 'default'}
                onSelect={() => void run(() => onUpdate({ is_active: !member.is_active }))}
              >
                <PowerIcon size={16} aria-hidden />
                {member.is_active ? 'Desactivar' : 'Activar'}
              </DropdownMenuItem>
            </MoreActionsMenu>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={mode.kind === 'confirm-pin'}
        onCancel={() => setMode({ kind: 'view' })}
        title="Generar nuevo PIN"
        cancelLabel="Cancelar"
        confirmLabel="Generar nuevo PIN"
        onConfirm={() => void run(onRegeneratePin)}
        busy={busy}
        error={error}
      >
        {member.full_name} cierra sesión en todos sus dispositivos de inmediato y va a necesitar el nuevo PIN. El código no
        cambia.
      </ConfirmDialog>

      {error && mode.kind !== 'confirm-pin' && <ErrorText>{error}</ErrorText>}
    </li>
  )
}
