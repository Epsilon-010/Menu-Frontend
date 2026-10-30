import { PlusIcon, SlidersHorizontalIcon } from '@phosphor-icons/react'
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
  return error instanceof CatalogError ? error.message : 'Something went wrong. Please try again.'
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
      New group
    </Button>
  )

  const header = (
    <SectionHeader
      title="Modifiers"
      description="Choices guests make on an item, like a size or extras. Attach a group to as many items as you like in Menu; editing it here changes it on all of them."
      action={list.status === 'loaded' ? newGroupButton : undefined}
    />
  )

  if (list.status !== 'loaded') {
    return (
      <div className="space-y-8">
        {header}
        {list.status === 'loading' ? (
          <ListSkeleton label="Loading the modifier groups" rows={3} />
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
          <GroupEditor submitLabel="Add group" onSubmit={handleCreate} onCancel={cancelCreate} />
        </Card>
      )}
      {stale && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-amber-50 p-4">
          <p className="text-sm text-amber-900">Your change was saved, but the list could not refresh. {stale}</p>
          <Button variant="secondary" onClick={() => void reload(false).then((failure) => setStale(failure))}>
            Refresh the list
          </Button>
        </div>
      )}
      {groups.length === 0 ? (
        !creating && (
          <EmptyState
            icon={<SlidersHorizontalIcon size={24} aria-hidden />}
            title="Offer sizes and extras"
            action={newGroupButton}
          >
            Create a group like Size (choose 1) or Salsas (up to 3), give each option its extra price, then pick the
            group on your items in Menu.
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
