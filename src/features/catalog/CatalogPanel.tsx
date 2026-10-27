import { BowlFoodIcon, PlusIcon } from '@phosphor-icons/react'
import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { TextInput } from '../../shared/ui/Field.tsx'
import { EmptyState, ErrorText, ListSkeleton, LoadError } from '../../shared/ui/Feedback.tsx'
import { Card, SectionHeader } from '../../shared/ui/Section.tsx'
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
import { moved } from './styles.ts'

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

  async function load() {
    try {
      setList({ status: 'loaded', categories: await listCatalog() })
    } catch (error) {
      setList({ status: 'error', message: messageOf(error) })
    }
  }

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
              void load()
            }}
          />
        )}
      </div>
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
    <div className="space-y-8">
      {header}
      {addCategory}
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
              actions={categoryActions(category, index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
