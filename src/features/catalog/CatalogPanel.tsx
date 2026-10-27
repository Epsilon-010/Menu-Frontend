import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
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
  uploadItemImage,
  type CategoryWithItems,
} from './api.ts'
import { CategorySection, type CategoryActions } from './CategorySection.tsx'
import type { ItemActions } from './ItemRow.tsx'
import { INPUT, moved, PRIMARY_BUTTON } from './styles.ts'

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

  const load = useCallback(async () => {
    try {
      setList({ status: 'loaded', categories: await listCatalog() })
    } catch (error) {
      setList({ status: 'error', message: messageOf(error) })
    }
  }, [])

  useEffect(() => {
    let active = true
    listCatalog()
      .then((categories) => {
        if (active) setList({ status: 'loaded', categories })
      })
      .catch((error: unknown) => {
        if (active) setList({ status: 'error', message: messageOf(error) })
      })
    return () => {
      active = false
    }
  }, [])

  /** Runs a change and reloads the catalog, so positions always match the server. */
  async function change(action: () => Promise<unknown>): Promise<string | null> {
    try {
      await action()
      await load()
      return null
    } catch (error) {
      // Another tab may have changed the catalog: show the fresh state with the error.
      await load()
      return messageOf(error)
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    const failure = await change(() => createCategory(name))
    setSaving(false)
    setCreateError(failure)
    if (failure === null) setName('')
  }

  if (list.status === 'loading') return <p className="text-sm text-slate-500">Loading the menu…</p>
  if (list.status === 'error') {
    return (
      <p role="alert" className="text-sm text-red-600">
        {list.message}{' '}
        <button
          type="button"
          onClick={() => {
            setList({ status: 'loading' })
            void load()
          }}
          className="underline"
        >
          Retry
        </button>
      </p>
    )
  }

  const { categories } = list
  const categoryIds = categories.map((category) => category.id)

  function itemActions(category: CategoryWithItems): (itemId: string, index: number) => ItemActions {
    const itemIds = category.items.map((item) => item.id)
    return (itemId, index) => ({
      update: (changes) => change(() => updateItem(itemId, changes)),
      move: (delta) => change(() => reorderItems(category.id, moved(itemIds, index, delta))),
      uploadImage: (file) => change(() => uploadItemImage(itemId, file)),
      removeImage: () => change(() => removeItemImage(itemId)),
      remove: () => change(() => deleteItem(itemId)),
    })
  }

  function categoryActions(category: CategoryWithItems, index: number): CategoryActions {
    return {
      update: (changes) => change(() => updateCategory(category.id, changes)),
      move: (delta) => change(() => reorderCategories(moved(categoryIds, index, delta))),
      remove: () => change(() => deleteCategory(category.id)),
      addItem: (values) => change(() => createItem({ ...values, category_id: category.id })),
      itemActions: itemActions(category),
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Menu</h2>
        <p className="text-sm text-slate-600">
          Categories and items appear on the tables in this order. Hidden categories and items stay here but are not
          shown on the tables.
        </p>
      </div>

      <form onSubmit={handleCreate} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="font-medium text-slate-900">Add a category</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 space-y-1">
            <span className="text-sm text-slate-700">Name</span>
            <input
              required
              maxLength={60}
              placeholder="Tacos"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={INPUT}
            />
          </label>
          <button type="submit" disabled={saving} className={PRIMARY_BUTTON}>
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
        {createError && (
          <p role="alert" className="text-sm text-red-600">
            {createError}
          </p>
        )}
      </form>

      {categories.length === 0 ? (
        <p className="text-sm text-slate-500">No categories yet.</p>
      ) : (
        categories.map((category, index) => (
          <CategorySection
            key={category.id}
            category={category}
            categories={categories}
            isFirst={index === 0}
            isLast={index === categories.length - 1}
            actions={categoryActions(category, index)}
          />
        ))
      )}
    </section>
  )
}
