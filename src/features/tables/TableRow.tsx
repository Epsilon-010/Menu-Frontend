import { ChairIcon, KeyIcon, PencilSimpleIcon, PowerIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Button, IconButton } from '../../shared/ui/Button.tsx'
import { MOTION } from '../../shared/ui/classes.ts'
import { TextInput } from '../../shared/ui/Field.tsx'
import { Badge, ErrorText } from '../../shared/ui/Feedback.tsx'
import { useRowAction } from '../../shared/ui/useRowAction.ts'
import type { Table, TableChanges } from './api.ts'

type Mode = { kind: 'view' } | { kind: 'rename'; name: string } | { kind: 'confirm-pin' }

interface TableRowProps {
  table: Table
  /** Resolve to an error message, or null on success. */
  onUpdate: (changes: TableChanges) => Promise<string | null>
  onRegeneratePin: () => Promise<string | null>
}

export function TableRow({ table, onUpdate, onRegeneratePin }: TableRowProps) {
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
            aria-label="Table name"
            required
            maxLength={60}
            autoFocus
            value={mode.name}
            onChange={(event) => setMode({ kind: 'rename', name: event.target.value })}
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
          <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${table.is_active ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-50 text-zinc-300'}`}>
            <ChairIcon size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`font-medium ${table.is_active ? 'text-zinc-950' : 'text-zinc-400'}`}>{table.name}</p>
              {!table.is_active && <Badge>Inactive</Badge>}
            </div>
            <p className="text-sm text-zinc-500">
              Code <span className="font-mono tracking-widest text-zinc-700">{table.code}</span>
            </p>
          </div>
          <div className="flex items-center gap-1">
            <IconButton
              label="Rename table"
              icon={<PencilSimpleIcon size={16} />}
              disabled={busy}
              onClick={() => setMode({ kind: 'rename', name: table.name })}
            />
            <IconButton label="Generate a new PIN" icon={<KeyIcon size={16} />} disabled={busy} onClick={() => setMode({ kind: 'confirm-pin' })} />
            <IconButton
              label={table.is_active ? 'Deactivate table' : 'Activate table'}
              tone={table.is_active ? 'danger' : 'default'}
              icon={<PowerIcon size={16} />}
              disabled={busy}
              onClick={() => void run(() => onUpdate({ is_active: !table.is_active }))}
            />
          </div>
        </div>
      )}

      {mode.kind === 'confirm-pin' && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl bg-amber-50 p-4">
          <p className="flex-1 text-sm text-amber-900">
            The tablet of {table.name} signs out right away and will need the new PIN.
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
