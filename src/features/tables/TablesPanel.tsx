import { ChairIcon, KeyIcon, PlusIcon } from '@phosphor-icons/react'
import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { TextInput } from '../../shared/ui/Field.tsx'
import { EmptyState, ErrorText, ListSkeleton, LoadError } from '../../shared/ui/Feedback.tsx'
import { Card, SectionHeader } from '../../shared/ui/Section.tsx'
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
    <div className="space-y-8">
      <SectionHeader
        title="Tables"
        description="Each tablet signs in with its table code and a PIN. The PIN is shown only once; a new PIN or deactivating the table signs its tablet out right away."
      />

      <Card className="p-4">
        <form onSubmit={handleCreate} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <TextInput
              aria-label="New table name"
              required
              maxLength={60}
              placeholder="New table, like Table 4 or Terrace 2"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="min-w-0 flex-1"
            />
            <Button type="submit" variant="primary" icon={<PlusIcon size={16} aria-hidden />} disabled={saving}>
              {saving ? 'Adding…' : 'Add table'}
            </Button>
          </div>
          {createError && <ErrorText>{createError}</ErrorText>}
        </form>
      </Card>

      {credentials && (
        <div role="status" className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <KeyIcon size={20} aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-amber-950">Tablet credentials for {credentials.name}</p>
              <p className="text-sm text-amber-800">Write the PIN down now. It will not be shown again.</p>
            </div>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-4">
              <dt className="text-xs font-medium text-zinc-500">Table code</dt>
              <dd className="font-mono text-2xl tracking-widest text-zinc-950">{credentials.code}</dd>
            </div>
            <div className="rounded-xl bg-white p-4">
              <dt className="text-xs font-medium text-zinc-500">PIN</dt>
              <dd className="font-mono text-2xl tracking-widest text-zinc-950">{credentials.pin}</dd>
            </div>
          </dl>
          <Button variant="secondary" onClick={() => setCredentials(null)}>
            I wrote it down
          </Button>
        </div>
      )}

      {list.status === 'loading' && <ListSkeleton label="Loading tables" />}
      {list.status === 'error' && <LoadError message={list.message} onRetry={retry} />}
      {list.status === 'loaded' &&
        (list.tables.length === 0 ? (
          <EmptyState icon={<ChairIcon size={24} aria-hidden />} title="No tables yet">
            Add one table per tablet. You get a code and a PIN to sign that tablet in as its table.
          </EmptyState>
        ) : (
          <Card className="p-2">
            <ul className="space-y-1">
              {list.tables.map((table) => (
                <TableRow
                  key={table.id}
                  table={table}
                  onUpdate={(changes) => handleUpdate(table.id, changes)}
                  onRegeneratePin={() => handleRegeneratePin(table.id)}
                />
              ))}
            </ul>
          </Card>
        ))}
    </div>
  )
}
