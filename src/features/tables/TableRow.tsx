import { ChairIcon, CopyIcon, KeyIcon, PencilSimpleIcon, PowerIcon, QrCodeIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Button, IconButton } from '../../shared/ui/Button.tsx'
import { MOTION } from '../../shared/ui/classes.ts'
import { TextInput } from '../../shared/ui/Field.tsx'
import { Badge, ErrorText } from '../../shared/ui/Feedback.tsx'
import { useRowAction } from '../../shared/ui/useRowAction.ts'
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
    <div className="space-y-2 rounded-xl bg-zinc-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <QrCodeIcon size={16} className="shrink-0 text-zinc-500" aria-hidden />
        <span className="text-xs font-medium text-zinc-500">Link del QR</span>
        <code className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-700 select-all" title={link}>
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
    <li className={`space-y-4 rounded-lg p-3 hover:bg-zinc-50 ${MOTION}`} aria-busy={busy}>
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
          <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${table.is_active ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-50 text-zinc-300'}`}>
            <ChairIcon size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`font-medium ${table.is_active ? 'text-zinc-950' : 'text-zinc-400'}`}>{table.name}</p>
              {!table.is_active && <Badge>Inactiva</Badge>}
            </div>
            <p className="text-sm text-zinc-500">
              Código <span className="font-mono tracking-widest text-zinc-700">{table.code}</span>
            </p>
          </div>
          <div className="flex items-center gap-1">
            <IconButton
              label="Cambiar nombre de la mesa"
              icon={<PencilSimpleIcon size={16} />}
              disabled={busy}
              onClick={() => setMode({ kind: 'rename', name: table.name })}
            />
            <IconButton label="Generar un nuevo PIN" icon={<KeyIcon size={16} />} disabled={busy} onClick={() => setMode({ kind: 'confirm-pin' })} />
            <IconButton
              label={table.is_active ? 'Desactivar mesa' : 'Activar mesa'}
              tone={table.is_active ? 'danger' : 'default'}
              icon={<PowerIcon size={16} />}
              disabled={busy}
              onClick={() => void run(() => onUpdate({ is_active: !table.is_active }))}
            />
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
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-zinc-50 p-3">
            <p className="flex-1 text-sm text-zinc-500">Esta mesa aún no tiene link de QR.</p>
            <Button variant="secondary" disabled={busy} onClick={() => setMode({ kind: 'confirm-qr' })}>
              Crear link de QR
            </Button>
          </div>
        ))}

      {mode.kind === 'confirm-qr' && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl bg-amber-50 p-4">
          <p className="flex-1 text-sm text-amber-900">
            El QR anterior de {table.name} deja de funcionar y se cierra la sesión de los comensales que entraron con
            él. La tablet sigue con su sesión. Vuelve a imprimir el nuevo link.
          </p>
          <div className="flex gap-2">
            <Button variant="primary" disabled={busy} onClick={() => void run(onRegenerateQr)}>
              Generar nuevo QR
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setMode({ kind: 'view' })}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {mode.kind === 'confirm-pin' && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl bg-amber-50 p-4">
          <p className="flex-1 text-sm text-amber-900">
            La tablet de {table.name} cierra sesión de inmediato y va a necesitar el nuevo PIN.
          </p>
          <div className="flex gap-2">
            <Button variant="primary" disabled={busy} onClick={() => void run(onRegeneratePin)}>
              Generar nuevo PIN
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setMode({ kind: 'view' })}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {error && <ErrorText>{error}</ErrorText>}
    </li>
  )
}
