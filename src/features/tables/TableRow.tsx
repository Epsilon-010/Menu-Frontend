import { useState, type FormEvent } from 'react'
import type { Table, TableChanges } from './api.ts'

const INPUT = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none'
const BUTTON = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50'

type Mode = { kind: 'view' } | { kind: 'rename'; name: string } | { kind: 'confirm-pin' }

interface TableRowProps {
  table: Table
  /** Resolve to an error message, or null on success. */
  onUpdate: (changes: TableChanges) => Promise<string | null>
  onRegeneratePin: () => Promise<string | null>
}

export function TableRow({ table, onUpdate, onRegeneratePin }: TableRowProps) {
  const [mode, setMode] = useState<Mode>({ kind: 'view' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<string | null>) {
    setBusy(true)
    const failure = await action()
    setBusy(false)
    setError(failure)
    if (failure === null) setMode({ kind: 'view' })
  }

  function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode.kind !== 'rename') return
    void run(() => onUpdate({ name: mode.name }))
  }

  return (
    <li className="space-y-2 p-4">
      {mode.kind === 'rename' ? (
        <form onSubmit={handleRename} className="flex flex-wrap items-center gap-2">
          <input
            aria-label="Table name"
            required
            maxLength={60}
            value={mode.name}
            onChange={(event) => setMode({ kind: 'rename', name: event.target.value })}
            className={INPUT}
          />
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
            <p className={table.is_active ? 'font-medium text-slate-900' : 'font-medium text-slate-400 line-through'}>
              {table.name}
            </p>
            <p className="text-sm text-slate-500">
              Code <span className="font-mono tracking-widest">{table.code}</span>
              {!table.is_active && ' · Inactive'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode({ kind: 'rename', name: table.name })}
              className={BUTTON}
            >
              Rename
            </button>
            <button type="button" disabled={busy} onClick={() => setMode({ kind: 'confirm-pin' })} className={BUTTON}>
              New PIN
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => onUpdate({ is_active: !table.is_active }))}
              className={BUTTON}
            >
              {table.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      )}

      {mode.kind === 'confirm-pin' && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
          <span>The tablet of this table will be signed out and need the new PIN.</span>
          <button type="button" disabled={busy} onClick={() => void run(onRegeneratePin)} className={BUTTON}>
            Generate new PIN
          </button>
          <button type="button" disabled={busy} onClick={() => setMode({ kind: 'view' })} className={BUTTON}>
            Cancel
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </li>
  )
}
