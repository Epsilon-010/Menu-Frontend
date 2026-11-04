import { LightbulbIcon, PlusIcon, SlidersHorizontalIcon } from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'
import { createDraftIds } from '../../shared/api/idempotency.ts'
import { Button } from '../../shared/ui/Button.tsx'
import { EmptyState, ListSkeleton, LoadError } from '../../shared/ui/Feedback.tsx'
import { Card, SectionHeader } from '../../shared/ui/Section.tsx'
import { CatalogError } from '../catalog/api.ts'
import { createChangeRunner, createLatestOnly, createSerialQueue } from '../catalog/sync.ts'
import {
  createModifierGroup,
  deleteModifierGroup,
  listModifierGroups,
  updateModifierGroup,
  type ModifierGroup,
} from './api.ts'
import { GroupEditor } from './GroupEditor.tsx'
import { GroupRow, type GroupActions } from './GroupRow.tsx'
import type { GroupPayload } from './logic.ts'

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; groups: ModifierGroup[] }

function messageOf(error: unknown): string {
  return error instanceof CatalogError ? error.message : 'Algo salió mal. Intenta de nuevo.'
}

/** Admin section for the tenant's library of modifier groups (sizes, extras...) that items use. */
export function ModifiersPanel() {
  const [list, setList] = useState<ListState>({ status: 'loading' })
  const [creating, setCreating] = useState(false)
  // Stable for the panel's life, like the catalog panel: one change at a time, newest reload wins.
  const [enqueue] = useState(createSerialQueue)
  const [latest] = useState(createLatestOnly)
  const [library] = useState(() => ({ current: [] as ModifierGroup[] }))
  // Set when a change was saved but the screen could not refresh afterwards.
  const [stale, setStale] = useState<string | null>(null)
  // Client id for the new group: a retry of the same values reuses it, edited values get a new one.
  const [drafts] = useState(() => createDraftIds())

  /** Loads the library; only the newest load is applied. Returns the error message, if any. */
  const reload = useCallback(
    async (showErrors: boolean): Promise<string | null> => {
      let failure: string | null = null
      await latest.run(
        listModifierGroups,
        (groups) => {
          library.current = groups
          setList({ status: 'loaded', groups })
        },
        (error) => {
          failure = messageOf(error)
          if (showErrors) setList({ status: 'error', message: failure })
        },
      )
      return failure
    },
    [latest, library],
  )

  useEffect(() => {
    void reload(true)
    return () => latest.cancel()
  }, [reload, latest])

  const change = createChangeRunner<ModifierGroup[]>({
    enqueue,
    current: () => library.current,
    reload: async () => {
      const failure = await reload(false)
      if (failure === null) setStale(null)
      return failure
    },
    messageOf,
    onStale: setStale,
  })

  async function handleCreate(payload: GroupPayload): Promise<string | null> {
    const failure = await change(() => createModifierGroup({ ...payload, id: drafts.idFor(JSON.stringify(payload)) }))
    if (failure === null) {
      drafts.reset()
      setCreating(false)
    }
    return failure
  }

  function cancelCreate() {
    drafts.reset()
    setCreating(false)
  }

  function groupActions(group: ModifierGroup): GroupActions {
    return {
      // The full ordered option list: saved options keep their id, new ones have none, left out ones go.
      update: (payload) => change(() => updateModifierGroup(group.id, payload)),
      remove: () => change(() => deleteModifierGroup(group.id)),
    }
  }

  const newGroupButton = (
    <Button variant="primary" icon={<PlusIcon size={16} aria-hidden />} disabled={creating} onClick={() => setCreating(true)}>
      Nuevo grupo
    </Button>
  )

  const header = (
    <div className="space-y-4">
      <SectionHeader
        title="Opciones y extras"
        description="Lo que los comensales eligen en un producto, como el tamaño o los extras. Asigna un grupo a todos los productos que quieras en Menú; al editarlo aquí cambia en todos."
        action={list.status === 'loaded' ? newGroupButton : undefined}
      />
      <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-subtle text-ink-soft">
          <LightbulbIcon size={16} aria-hidden />
        </span>
        <div className="space-y-1 text-sm">
          <p className="font-medium text-ink">Ejemplo: Proteína (elige 1): Pollo, Tasajo +$20</p>
          <p className="text-muted">
            Crea el grupo una vez, ponle sus opciones con su precio extra y elígelo en cada producto que lo ofrezca. Al
            pedir, el comensal escoge una opción y el precio se suma solo.
          </p>
        </div>
      </div>
    </div>
  )

  if (list.status !== 'loaded') {
    return (
      <div className="space-y-8">
        {header}
        {list.status === 'loading' ? (
          <ListSkeleton label="Cargando los grupos de opciones" rows={3} />
        ) : (
          <LoadError
            message={list.message}
            onRetry={() => {
              setList({ status: 'loading' })
              void reload(true)
            }}
          />
        )}
      </div>
    )
  }

  const { groups } = list

  return (
    <div className="space-y-8">
      {header}
      {creating && (
        <Card className="p-2">
          <GroupEditor submitLabel="Agregar grupo" onSubmit={handleCreate} onCancel={cancelCreate} />
        </Card>
      )}
      {stale && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-amber-50 p-4">
          <p className="text-sm text-amber-900">Tu cambio se guardó, pero la lista no se pudo actualizar. {stale}</p>
          <Button variant="secondary" onClick={() => void reload(false).then((failure) => setStale(failure))}>
            Actualizar la lista
          </Button>
        </div>
      )}
      {groups.length === 0 ? (
        !creating && (
          <EmptyState
            icon={<SlidersHorizontalIcon size={24} aria-hidden />}
            title="Ofrece tamaños y extras"
            action={newGroupButton}
          >
            Crea un grupo como Tamaño (elige 1) o Salsas (hasta 3), ponle a cada opción su precio extra y después
            elige el grupo en tus productos en Menú.
          </EmptyState>
        )
      ) : (
        <Card className="p-2">
          <ul className="space-y-1">
            {groups.map((group) => (
              <GroupRow key={group.id} group={group} actions={groupActions(group)} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
