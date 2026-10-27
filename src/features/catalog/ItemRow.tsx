import { useState, type ChangeEvent } from 'react'
import type { CatalogItem, Category, ItemChanges } from './api.ts'
import { ItemForm } from './ItemForm.tsx'
import { formatPrice } from './price.ts'
import { BUTTON, DANGER_BUTTON, INPUT } from './styles.ts'

type Mode = 'view' | 'edit' | 'confirm-delete'

/** Every action resolves to an error message, or null on success. */
export interface ItemActions {
  update: (changes: ItemChanges) => Promise<string | null>
  move: (delta: -1 | 1) => Promise<string | null>
  uploadImage: (file: File) => Promise<string | null>
  removeImage: () => Promise<string | null>
  remove: () => Promise<string | null>
}

interface ItemRowProps {
  item: CatalogItem
  categories: Category[]
  isFirst: boolean
  isLast: boolean
  actions: ItemActions
}

export function ItemRow({ item, categories, isFirst, isLast, actions }: ItemRowProps) {
  const [mode, setMode] = useState<Mode>('view')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<string | null>): Promise<string | null> {
    setBusy(true)
    const failure = await action()
    setBusy(false)
    setError(failure)
    if (failure === null) setMode('view')
    return failure
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void run(() => actions.uploadImage(file))
  }

  const thumbnail = item.image?.thumbnail_url

  return (
    <li className="space-y-3 p-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
          {thumbnail ? (
            <img src={thumbnail} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-xs text-slate-400">
              {item.image ? 'Image' : 'No image'}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className={item.is_available ? 'font-medium text-slate-900' : 'font-medium text-slate-400'}>
            {item.name} <span className="text-slate-600">· ${formatPrice(item.price_cents)}</span>
            {!item.is_available && <span className="ml-2 text-xs uppercase text-amber-700">Hidden</span>}
          </p>
          {item.description && <p className="text-sm text-slate-500">{item.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-label="Move up" disabled={busy || isFirst} onClick={() => void run(() => actions.move(-1))} className={BUTTON}>
            ↑
          </button>
          <button type="button" aria-label="Move down" disabled={busy || isLast} onClick={() => void run(() => actions.move(1))} className={BUTTON}>
            ↓
          </button>
          <button type="button" disabled={busy} onClick={() => setMode('edit')} className={BUTTON}>
            Edit
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => actions.update({ is_available: !item.is_available }))}
            className={BUTTON}
          >
            {item.is_available ? 'Hide' : 'Show'}
          </button>
          <label className={`${BUTTON} cursor-pointer ${busy ? 'pointer-events-none opacity-50' : ''}`}>
            {busy ? 'Working…' : item.image ? 'Change image' : 'Add image'}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="sr-only" />
          </label>
          {item.image && (
            <button type="button" disabled={busy} onClick={() => void run(actions.removeImage)} className={BUTTON}>
              Remove image
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => setMode('confirm-delete')} className={DANGER_BUTTON}>
            Delete
          </button>
        </div>
      </div>

      {mode === 'edit' && (
        <div className="space-y-2">
          <label className="block max-w-xs space-y-1">
            <span className="text-sm text-slate-700">Category</span>
            <select
              value={item.category_id}
              disabled={busy}
              onChange={(e) => void run(() => actions.update({ category_id: e.target.value }))}
              className={INPUT}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <ItemForm
            initial={item}
            submitLabel="Save"
            onSubmit={(values) => run(() => actions.update(values))}
            onCancel={() => setMode('view')}
          />
        </div>
      )}

      {mode === 'confirm-delete' && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
          <span>Delete “{item.name}” and its image?</span>
          <button type="button" disabled={busy} onClick={() => void run(actions.remove)} className={DANGER_BUTTON}>
            Delete item
          </button>
          <button type="button" disabled={busy} onClick={() => setMode('view')} className={BUTTON}>
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
