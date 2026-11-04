import { ChairIcon, CopyIcon, KeyIcon, PencilSimpleIcon, PowerIcon, QrCodeIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { DropdownMenuItem, DropdownMenuSeparator } from '../../components/ui/dropdown-menu.tsx'
import { Button } from '../../shared/ui/Button.tsx'
import { MOTION } from '../../shared/ui/classes.ts'
import { TextInput } from '../../shared/ui/Field.tsx'
import { Badge, ErrorText } from '../../shared/ui/Feedback.tsx'
import { useRowAction } from '../../shared/ui/useRowAction.ts'
import { ConfirmDialog, MoreActionsMenu, TooltipIconButton } from '../../shared/ui/RowActions.tsx'
import { qrLink, type Table, type TableChanges } from './api.ts'

type Mode = { kind: 'view' } | { kind: 'rename'; name: string } | { kind: 'confirm-pin' } | { kind: 'confirm-qr' }

interface TableRowProps {
  table: Table
  /** Resolve to an error message, or null on success. */
  onUpdate: (changes: TableChanges) => Promise<string | null>
  onRegeneratePin: () => Promise<string | null>
  onRegenerateQr: () => Promise<string | null>
}

type CopyState = 'idle' | 'copied' | 'failed'

/** The table's QR link as selectable text, with a copy button. */
function QrLinkRow({ link, onNewQr, disabled }: { link: string; onNewQr: () => void; disabled: boolean }) {
  const [copy, setCopy] = useState<CopyState>('idle')

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopy('copied')
    } catch {
      setCopy('failed')
    }
  }

  return (
    <div className="space-y-2 rounded-xl bg-canvas p-3">
      <div className="flex flex-wrap items-center gap-2">
        <QrCodeIcon size={16} className="shrink-0 text-muted" aria-hidden />
        <span className="text-xs font-medium text-muted">Link del QR</span>
        <code className="min-w-0 flex-1 truncate font-mono text-xs text-ink-soft select-all" title={link}>
          {link}
        </code>
        <div className="flex gap-1">
          <Button variant="secondary" icon={<CopyIcon size={16} aria-hidden />} onClick={() => void handleCopy()}>
            {copy === 'copied' ? 'Copiado' : 'Copiar link'}
          </Button>
          <Button variant="ghost" disabled={disabled} onClick={onNewQr}>
            Nuevo QR
          </Button>
        </div>
      </div>
      {copy === 'failed' && <ErrorText>No se pudo copiar aquí. Selecciona el link y cópialo a mano.</ErrorText>}
    </div>
  )
}

export function TableRow({ table, onUpdate, onRegeneratePin, onRegenerateQr }: TableRowProps) {
  const [mode, setMode] = useState<Mode>({ kind: 'view' })
  const { busy, error, run: runAction } = useRowAction()

  function run(action: () => Promise<string | null>) {
    return runAction(action, () => setMode({ kind: 'view' }))
  }

  function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode.kind !== 'rename') return
    void run(() => onUpdate({ name: mode.name }))
  }

  return (
    <li className={`space-y-4 rounded-lg p-3 hover:bg-canvas ${MOTION}`} aria-busy={busy}>
      {mode.kind === 'rename' ? (
        <form onSubmit={handleRename} className="flex flex-wrap items-center gap-2">
          <TextInput
            aria-label="Nombre de la mesa"
            required
            maxLength={60}
            autoFocus
            value={mode.name}
            onChange={(event) => setMode({ kind: 'rename', name: event.target.value })}
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
          <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${table.is_active ? 'bg-subtle text-ink-soft' : 'bg-canvas text-line-strong'}`}>
            <ChairIcon size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`font-medium ${table.is_active ? 'text-ink' : 'text-faint'}`}>{table.name}</p>
              {!table.is_active && <Badge>Inactiva</Badge>}
            </div>
            <p className="text-sm text-muted">
              Código <span className="font-mono tracking-widest text-ink-soft">{table.code}</span>
            </p>
          </div>
          <div className="flex items-center gap-1">
            <TooltipIconButton
              label="Cambiar nombre de la mesa"
              icon={<PencilSimpleIcon size={16} aria-hidden />}
              disabled={busy}
              onClick={() => setMode({ kind: 'rename', name: table.name })}
            />
            <MoreActionsMenu label={`Más acciones de ${table.name}`} disabled={busy}>
              <DropdownMenuItem onSelect={() => setMode({ kind: 'confirm-pin' })}>
                <KeyIcon size={16} aria-hidden />
                Generar un nuevo PIN
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                tone={table.is_active ? 'danger' : 'default'}
                onSelect={() => void run(() => onUpdate({ is_active: !table.is_active }))}
              >
                <PowerIcon size={16} aria-hidden />
                {table.is_active ? 'Desactivar mesa' : 'Activar mesa'}
              </DropdownMenuItem>
            </MoreActionsMenu>
          </div>
        </div>
      )}

      {mode.kind !== 'rename' &&
        (table.qr_token ? (
          <QrLinkRow
            link={qrLink(table.qr_token)}
            disabled={busy}
            onNewQr={() => setMode({ kind: 'confirm-qr' })}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-canvas p-3">
            <p className="flex-1 text-sm text-muted">Esta mesa aún no tiene link de QR.</p>
            <Button variant="secondary" disabled={busy} onClick={() => setMode({ kind: 'confirm-qr' })}>
              Crear link de QR
            </Button>
          </div>
        ))}

      <ConfirmDialog
        open={mode.kind === 'confirm-qr'}
        onCancel={() => setMode({ kind: 'view' })}
        title="Generar nuevo QR"
        cancelLabel="Cancelar"
        confirmLabel="Generar nuevo QR"
        onConfirm={() => void run(onRegenerateQr)}
        busy={busy}
        error={error}
      >
        El QR anterior de {table.name} deja de funcionar y se cierra la sesión de los comensales que entraron con él. La
        tablet sigue con su sesión. Vuelve a imprimir el nuevo link.
      </ConfirmDialog>

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
        La tablet de {table.name} cierra sesión de inmediato y va a necesitar el nuevo PIN.
      </ConfirmDialog>

      {error && mode.kind !== 'confirm-qr' && mode.kind !== 'confirm-pin' && <ErrorText>{error}</ErrorText>}
    </li>
  )
}
