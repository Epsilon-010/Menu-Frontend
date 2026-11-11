import { PencilSimpleIcon, PowerIcon, ShieldCheckIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { DropdownMenuItem } from '../../components/ui/dropdown-menu.tsx'
import { Button } from '../../shared/ui/Button.tsx'
import { MOTION } from '../../shared/ui/classes.ts'
import { TextInput } from '../../shared/ui/Field.tsx'
import { Badge, ErrorText } from '../../shared/ui/Feedback.tsx'
import { useRowAction } from '../../shared/ui/useRowAction.ts'
import { ConfirmDialog, MoreActionsMenu, TooltipIconButton } from '../../shared/ui/RowActions.tsx'
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
          <Button type="submit" variant="primary" disabled={busy}>
            Guardar
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setMode({ kind: 'view' })}>
            Cancelar
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${admin.is_active ? 'bg-leaf/15 text-leaf' : 'bg-canvas text-line-strong'}`}
          >
            <ShieldCheckIcon size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`font-medium ${admin.is_active ? 'text-ink' : 'text-faint'}`}>{admin.full_name}</p>
              {isYou && <Badge>Tú</Badge>}
              {admin.must_change_password && <Badge tone="warning">Contraseña temporal</Badge>}
              {!admin.is_active && <Badge tone="warning">Inactivo</Badge>}
            </div>
            <p className="truncate text-sm text-muted">{admin.email}</p>
          </div>
          <div className="flex items-center gap-1">
            <TooltipIconButton
              label="Editar nombre"
              icon={<PencilSimpleIcon size={16} aria-hidden />}
              disabled={busy}
              onClick={() => setMode({ kind: 'edit', full_name: admin.full_name })}
            />
            {!isYou && (
              <MoreActionsMenu label={`Más acciones de ${admin.full_name}`} disabled={busy}>
                <DropdownMenuItem
                  tone={admin.is_active ? 'danger' : 'default'}
                  onSelect={() =>
                    admin.is_active ? setMode({ kind: 'confirm-deactivate' }) : void run(() => onUpdate({ is_active: true }))
                  }
                >
                  <PowerIcon size={16} aria-hidden />
                  {admin.is_active ? 'Desactivar' : 'Activar'}
                </DropdownMenuItem>
              </MoreActionsMenu>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={mode.kind === 'confirm-deactivate'}
        onCancel={() => setMode({ kind: 'view' })}
        title={`Desactivar a ${admin.full_name}`}
        cancelLabel="Cancelar"
        confirmLabel="Desactivar"
        confirmVariant="danger"
        onConfirm={() => void run(() => onUpdate({ is_active: false }))}
        busy={busy}
        error={error}
      >
        {admin.full_name} cierra sesión en todos sus dispositivos de inmediato y no puede volver a entrar hasta que lo
        reactives.
      </ConfirmDialog>

      {error && mode.kind !== 'confirm-deactivate' && <ErrorText>{error}</ErrorText>}
    </li>
  )
}
