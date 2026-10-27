import { useState, type FormEvent } from 'react'
import type { Category, CategoryChanges, CategoryWithItems } from './api.ts'
import { ItemForm, type ItemFormValues } from './ItemForm.tsx'
import { ItemRow, type ItemActions } from './ItemRow.tsx'
import { BUTTON, DANGER_BUTTON, INPUT } from './styles.ts'

type Mode = { kind: 'view' } | { kind: 'rename'; name: string } | { kind: 'add-item' } | { kind: 'confirm-delete' }

/** Every action resolves to an error message, or null on success. */
export interface CategoryActions {
  update: (changes: CategoryChanges) => Promise<string | null>
  move: (delta: -1 | 1) => Promise<string | null>
  remove: () => Promise<string | null>
  addItem: (values: ItemFormValues) => Promise<string | null>
  itemActions: (itemId: string, index: number) => ItemActions
}

interface CategorySectionProps {
  category: CategoryWithItems
  categories: Category[]
  isFirst: boolean
  isLast: boolean
  actions: CategoryActions
}

export function CategorySection({ category, categories, isFirst, isLast, actions }: CategorySectionProps) {
  const [mode, setMode] = useState<Mode>({ kind: 'view' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<string | null>): Promise<string | null> {
    setBusy(true)
    const failure = await action()
    setBusy(false)
    setError(failure)
    if (failure === null) setMode({ kind: 'view' })
    return failure
  }

  function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode.kind === 'rename') void run(() => actions.update({ name: mode.name }))
  }

  const { items } = category

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <header className="space-y-2 border-b border-slate-200 p-4">
        {mode.kind === 'rename' ? (
          <form onSubmit={handleRename} className="flex flex-wrap items-center gap-2">
            <input
              aria-label="Category name"
              required
              maxLength={60}
              value={mode.name}
              onChange={(e) => setMode({ kind: 'rename', name: e.target.value })}
              className={`${INPUT} max-w-xs`}
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
            <h3 className={category.is_visible ? 'font-semibold text-slate-900' : 'font-semibold text-slate-400'}>
              {category.name}
              {!category.is_visible && <span className="ml-2 text-xs uppercase text-amber-700">Hidden</span>}
            </h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-label="Move category up" disabled={busy || isFirst} onClick={() => void run(() => actions.move(-1))} className={BUTTON}>
                ↑
              </button>
              <button type="button" aria-label="Move category down" disabled={busy || isLast} onClick={() => void run(() => actions.move(1))} className={BUTTON}>
                ↓
              </button>
              <button type="button" disabled={busy} onClick={() => setMode({ kind: 'rename', name: category.name })} className={BUTTON}>
                Rename
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(() => actions.update({ is_visible: !category.is_visible }))}
                className={BUTTON}
              >
                {category.is_visible ? 'Hide' : 'Show'}
              </button>
              <button type="button" disabled={busy} onClick={() => setMode({ kind: 'confirm-delete' })} className={DANGER_BUTTON}>
                Delete
              </button>
            </div>
          </div>
        )}

        {mode.kind === 'confirm-delete' && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <span>
              {items.length > 0 ? 'Move or delete its items first.' : `Delete the category “${category.name}”?`}
            </span>
            {items.length === 0 && (
              <button type="button" disabled={busy} onClick={() => void run(actions.remove)} className={DANGER_BUTTON}>
                Delete category
              </button>
            )}
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
      </header>

      {items.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">No items yet.</p>
      ) : (
        <ul className="divide-y divide-slate-200">
          {items.map((item, index) => (
            <ItemRow
              key={item.id}
              item={item}
              categories={categories}
              isFirst={index === 0}
              isLast={index === items.length - 1}
              actions={actions.itemActions(item.id, index)}
            />
          ))}
        </ul>
      )}

      <div className="border-t border-slate-200 p-4">
        {mode.kind === 'add-item' ? (
          <ItemForm submitLabel="Add item" onSubmit={(values) => run(() => actions.addItem(values))} onCancel={() => setMode({ kind: 'view' })} />
        ) : (
          <button type="button" disabled={busy} onClick={() => setMode({ kind: 'add-item' })} className={BUTTON}>
            Add item
          </button>
        )}
      </div>
    </section>
  )
}
