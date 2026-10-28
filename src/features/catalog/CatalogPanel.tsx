import { BowlFoodIcon, PlusIcon } from '@phosphor-icons/react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { TextInput } from '../../shared/ui/Field.tsx'
import { EmptyState, ErrorText, ListSkeleton, LoadError } from '../../shared/ui/Feedback.tsx'
import { Card, SectionHeader } from '../../shared/ui/Section.tsx'
import {
  attachItemImage,
  CatalogError,
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  listCatalog,
  removeItemImage,
  reorderCategories,
  reorderItems,
  updateCategory,
  updateItem,
  uploadImageFile,
  type CategoryWithItems,
} from './api.ts'
import { CategorySection, type CategoryActions } from './CategorySection.tsx'
import type { ItemActions } from './ItemRow.tsx'
import { movedById } from './order.ts'
import { createChangeRunner, createLatestOnly, createSerialQueue } from './sync.ts'

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; categories: CategoryWithItems[] }

function messageOf(error: unknown): string {
  return error instanceof CatalogError ? error.message : 'Something went wrong. Please try again.'
}

/** Admin section to build the menu: categories and items, their order, visibility and images. */
export function CatalogPanel() {
  const [list, setList] = useState<ListState>({ status: 'loading' })
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  // Stable for the panel's life (lazy initial state, not recreated on render).
  const [enqueue] = useState(createSerialQueue)
  const [latest] = useState(createLatestOnly)
  // The catalog as last loaded; queued changes read it when they run, not when they were clicked.
  // A stable mutable box (not a ref): it never drives rendering, only the queued changes read it.
  const [catalog] = useState(() => ({ current: [] as CategoryWithItems[] }))

  /** Loads the catalog; only the newest load is applied. Returns the error message, if any. */
  const reload = useCallback(
    async (showErrors: boolean): Promise<string | null> => {
      let failure: string | null = null
      await latest.run(
        listCatalog,
        (categories) => {
          catalog.current = categories
          setList({ status: 'loaded', categories })
        },
        (error) => {
          failure = messageOf(error)
          if (showErrors) setList({ status: 'error', message: failure })
        },
      )
      return failure
    },
    [latest, catalog],
  )

  useEffect(() => {
    void reload(true)
    return () => latest.cancel()
  }, [reload, latest])

  // Set when a change was saved but the screen could not refresh afterwards.
  const [stale, setStale] = useState<string | null>(null)
  // One id per new category, kept until its create succeeds: a retry never makes a duplicate.
  const [draftId, setDraftId] = useState(() => crypto.randomUUID())

  // Runs changes one at a time, then reloads, so positions always match the server. A saved change
  // is a success even when the reload fails (see createChangeRunner); the panel then says it is stale.
  const change = createChangeRunner<CategoryWithItems[]>({
    enqueue,
    current: () => catalog.current,
    reload: async () => {
      const failure = await reload(false)
      if (failure === null) setStale(null)
      return failure
    },
    messageOf,
    onStale: setStale,
  })

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    const failure = await change(() => createCategory(name, draftId))
    setSaving(false)
    setCreateError(failure)
    if (failure === null) {
      setName('')
      setDraftId(crypto.randomUUID())
    }
  }

  const header = (
    <SectionHeader
      title="Menu"
      description="Tables show categories and items in this order. Hidden ones stay here for you, but guests do not see them."
    />
  )

  const addCategory = (
    <Card className="p-4">
      <form onSubmit={handleCreate} className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <TextInput
            aria-label="New category name"
            required
            maxLength={60}
            placeholder="New category, like Tacos or Drinks"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-w-0 flex-1"
          />
          <Button type="submit" variant="primary" icon={<PlusIcon size={16} aria-hidden />} disabled={saving}>
            {saving ? 'Adding…' : 'Add category'}
          </Button>
        </div>
        {createError && <ErrorText>{createError}</ErrorText>}
      </form>
    </Card>
  )

  if (list.status !== 'loaded') {
    return (
      <div className="space-y-8">
        {header}
        {list.status === 'loading' ? (
          <ListSkeleton label="Loading the menu" rows={4} />
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

  const { categories } = list

  // Moves are computed by id from the catalog current when they run, never from this render.
  function itemActions(categoryId: string): (itemId: string) => ItemActions {
    return (itemId) => ({
      update: (changes) => change(() => updateItem(itemId, changes)),
      move: (delta) =>
        change((current) => {
          const items = current.find((category) => category.id === categoryId)?.items ?? []
          return reorderItems(categoryId, movedById(items.map((item) => item.id), itemId, delta))
        }),
      // The upload to the storage runs outside the queue (it can take seconds and touches no
      // catalog data); only attaching it is queued like every other change.
      uploadImage: async (file) => {
        let publicId: string
        try {
          publicId = await uploadImageFile(file)
        } catch (error) {
          return messageOf(error)
        }
        return change(() => attachItemImage(itemId, publicId))
      },
      removeImage: () => change(() => removeItemImage(itemId)),
      remove: () => change(() => deleteItem(itemId)),
    })
  }

  function categoryActions(category: CategoryWithItems): CategoryActions {
    return {
      update: (changes) => change(() => updateCategory(category.id, changes)),
      move: (delta) =>
        change((current) => reorderCategories(movedById(current.map((entry) => entry.id), category.id, delta))),
      remove: () => change(() => deleteCategory(category.id)),
      addItem: (values, id) => change(() => createItem({ ...values, id, category_id: category.id })),
      itemActions: itemActions(category.id),
    }
  }

  return (
    <div className="space-y-8">
      {header}
      {addCategory}
      {stale && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-amber-50 p-4">
          <p className="text-sm text-amber-900">Your change was saved, but the menu could not refresh. {stale}</p>
          <Button variant="secondary" onClick={() => void reload(false).then((failure) => setStale(failure))}>
            Refresh the menu
          </Button>
        </div>
      )}
      {categories.length === 0 ? (
        <EmptyState icon={<BowlFoodIcon size={24} aria-hidden />} title="Start your menu with a category">
          Group your dishes the way guests look for them, like Tacos, Drinks or Desserts. Then add items with a price
          and a photo.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {categories.map((category, index) => (
            <CategorySection
              key={category.id}
              category={category}
              categories={categories}
              isFirst={index === 0}
              isLast={index === categories.length - 1}
              actions={categoryActions(category)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
