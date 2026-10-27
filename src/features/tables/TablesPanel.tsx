import { useEffect, useState, type FormEvent } from 'react'
import {
  createTable,
  listTables,
  regenerateTablePin,
  TableError,
  updateTable,
  type Table,
  type TableChanges,
  type TableWithPin,
} from './api.ts'
import { TableRow } from './TableRow.tsx'

type ListState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'loaded'; tables: Table[] }

function messageOf(error: unknown): string {
  return error instanceof TableError ? error.message : 'Something went wrong. Please try again.'
}

function byName(a: Table, b: Table): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
}

function withoutPin(table: TableWithPin): Table {
  return { id: table.id, name: table.name, code: table.code, is_active: table.is_active }
}

/** Admin section to manage the tenant's tables and the credentials of their tablets. */
export function TablesPanel() {
  const [list, setList] = useState<ListState>({ status: 'loading' })
  const [loadKey, setLoadKey] = useState(0)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  // The PIN only exists in the create/regenerate response: shown once, never stored.
  const [credentials, setCredentials] = useState<TableWithPin | null>(null)

  useEffect(() => {
    let active = true
    listTables()
      .then((tables) => {
        if (active) setList({ status: 'loaded', tables: tables.sort(byName) })
      })
      .catch((error: unknown) => {
        if (active) setList({ status: 'error', message: messageOf(error) })
      })
    return () => {
      active = false
    }
  }, [loadKey])

  function retry() {
    setList({ status: 'loading' })
    setLoadKey((key) => key + 1)
  }

  function upsert(table: Table) {
    setList((current) =>
      current.status === 'loaded'
        ? { status: 'loaded', tables: [...current.tables.filter((t) => t.id !== table.id), table].sort(byName) }
        : current,
    )
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const created = await createTable(name)
      upsert(withoutPin(created))
      setCredentials(created)
      setName('')
      setCreateError(null)
    } catch (error) {
      setCreateError(messageOf(error))
    } finally {
      setSaving(false)
    }
  }

  // Row actions return an error message for the row, or null on success.
  async function handleUpdate(id: string, changes: TableChanges): Promise<string | null> {
    try {
      upsert(await updateTable(id, changes))
      return null
    } catch (error) {
      return messageOf(error)
    }
  }

  async function handleRegeneratePin(id: string): Promise<string | null> {
    try {
      const regenerated = await regenerateTablePin(id)
      upsert(withoutPin(regenerated))
      setCredentials(regenerated)
      return null
    } catch (error) {
      return messageOf(error)
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Tables</h2>
        <p className="text-sm text-slate-600">
          Each tablet signs in with its table code and PIN. The PIN is shown only once; generating a new one or
          deactivating the table signs its tablet out right away.
        </p>
      </div>

      <form onSubmit={handleCreate} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="font-medium text-slate-900">Add a table</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 space-y-1">
            <span className="text-sm text-slate-700">Name or number</span>
            <input
              required
              maxLength={60}
              placeholder="Table 4"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
        {createError && (
          <p role="alert" className="text-sm text-red-600">
            {createError}
          </p>
        )}
      </form>

      {credentials && (
        <div role="status" className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="font-medium text-amber-900">Tablet credentials for {credentials.name}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-amber-900">
            <dt className="text-sm">Table code</dt>
            <dd className="font-mono text-lg tracking-widest">{credentials.code}</dd>
            <dt className="text-sm">PIN</dt>
            <dd className="font-mono text-lg tracking-widest">{credentials.pin}</dd>
          </dl>
          <p className="text-sm text-amber-800">Write the PIN down now: it will not be shown again.</p>
          <button
            type="button"
            onClick={() => setCredentials(null)}
            className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-100"
          >
            Done
          </button>
        </div>
      )}

      {list.status === 'loading' && <p className="text-sm text-slate-500">Loading tables…</p>}
      {list.status === 'error' && (
        <p role="alert" className="text-sm text-red-600">
          {list.message}{' '}
          <button type="button" onClick={retry} className="underline">
            Retry
          </button>
        </p>
      )}
      {list.status === 'loaded' &&
        (list.tables.length === 0 ? (
          <p className="text-sm text-slate-500">No tables yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {list.tables.map((table) => (
              <TableRow
                key={table.id}
                table={table}
                onUpdate={(changes) => handleUpdate(table.id, changes)}
                onRegeneratePin={() => handleRegeneratePin(table.id)}
              />
            ))}
          </ul>
        ))}
    </section>
  )
}
