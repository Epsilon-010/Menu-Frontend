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
  regenerateTableQr,
  TableError,
  updateTable,
  type Table,
  type TableChanges,
  type TableWithPin,
} from './api.ts'
import { TableRow } from './TableRow.tsx'
import { createDraftIds } from '../../shared/api/idempotency.ts'

type ListState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'loaded'; tables: Table[] }

function messageOf(error: unknown): string {
  return error instanceof TableError ? error.message : 'Algo salió mal. Intenta de nuevo.'
}

function byName(a: Table, b: Table): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
}

function withoutPin(table: TableWithPin): Table {
  return { id: table.id, name: table.name, code: table.code, is_active: table.is_active, qr_token: table.qr_token }
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
  // Client ids for new tables: a retry of the same name reuses its id, another name gets a new one.
  const [drafts] = useState(() => createDraftIds())

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
      const created = await createTable(name, drafts.idFor(name.trim()))
      upsert(withoutPin(created))
      setCredentials(created)
      setName('')
      drafts.reset()
      setCreateError(null)
    } catch (error) {
      setCreateError(messageOf(error))
      if (error instanceof TableError && error.alreadyCreated) {
        // The first attempt did create it (its answer was lost): show it and start a fresh draft.
        setName('')
        drafts.reset()
        retry()
      }
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

  async function handleRegenerateQr(id: string): Promise<string | null> {
    try {
      upsert(await regenerateTableQr(id))
      return null
    } catch (error) {
      return messageOf(error)
    }
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        icon={<ChairIcon size={24} weight="fill" aria-hidden />}
        title="Mesas"
        description="Cada tablet inicia sesión con el código de su mesa y un PIN. El PIN se muestra una sola vez; un nuevo PIN o desactivar la mesa cierra la sesión de su tablet de inmediato. Los comensales sin tablet entran desde su celular con el link del QR de la mesa mientras un mesero la tenga abierta."
      />
      <p className="text-sm text-muted">
        Por ahora, para imprimir un código QR, pega el link de la mesa en cualquier generador de códigos QR.
      </p>

      <Card className="p-4">
        <form onSubmit={handleCreate} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <TextInput
              aria-label="Nombre de la nueva mesa"
              required
              maxLength={60}
              placeholder="Nueva mesa, como Mesa 4 o Terraza 2"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="min-w-0 flex-1"
            />
            <Button type="submit" variant="primary" icon={<PlusIcon size={16} aria-hidden />} disabled={saving}>
              {saving ? 'Agregando…' : 'Agregar mesa'}
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
              <p className="font-semibold text-amber-950">Credenciales de la tablet de {credentials.name}</p>
              <p className="text-sm text-amber-800">Anota el PIN ahora. No se volverá a mostrar.</p>
            </div>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-4">
              <dt className="text-xs font-medium text-muted">Código de la mesa</dt>
              <dd className="font-mono text-2xl tracking-widest text-ink">{credentials.code}</dd>
            </div>
            <div className="rounded-xl bg-white p-4">
              <dt className="text-xs font-medium text-muted">PIN</dt>
              <dd className="font-mono text-2xl tracking-widest text-ink">{credentials.pin}</dd>
            </div>
          </dl>
          <Button variant="secondary" onClick={() => setCredentials(null)}>
            Ya lo anoté
          </Button>
        </div>
      )}

      {list.status === 'loading' && <ListSkeleton label="Cargando mesas" />}
      {list.status === 'error' && <LoadError message={list.message} onRetry={retry} />}
      {list.status === 'loaded' &&
        (list.tables.length === 0 ? (
          <EmptyState icon={<ChairIcon size={24} aria-hidden />} title="Aún no hay mesas">
            Agrega una mesa por tablet. Recibes un código y un PIN para iniciar sesión en esa tablet como su mesa.
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
                  onRegenerateQr={() => handleRegenerateQr(table.id)}
                />
              ))}
            </ul>
          </Card>
        ))}
    </div>
  )
}
