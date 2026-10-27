import {
  CaretDownIcon,
  CaretUpIcon,
  EyeIcon,
  EyeSlashIcon,
  ImageSquareIcon,
  PencilSimpleIcon,
  TrashIcon,
  UploadSimpleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useState, type ChangeEvent } from 'react'
import { Button, IconButton } from '../../shared/ui/Button.tsx'
import { MOTION } from '../../shared/ui/classes.ts'
import { Field, Select } from '../../shared/ui/Field.tsx'
import { Badge, ErrorText } from '../../shared/ui/Feedback.tsx'
import type { CatalogItem, Category, ItemChanges } from './api.ts'
import { ItemForm } from './ItemForm.tsx'
import { formatPrice } from './price.ts'

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

  /** `close` returns to the plain view on success; quick actions keep an open form as it is. */
  async function run(action: () => Promise<string | null>, close = false): Promise<string | null> {
    setBusy(true)
    const failure = await action()
    setBusy(false)
    setError(failure)
    if (failure === null && close) setMode('view')
    return failure
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void run(() => actions.uploadImage(file))
  }

  const thumbnail = item.image?.thumbnail_url

  return (
    <li className={`rounded-lg p-3 hover:bg-zinc-50 ${MOTION} ${busy ? 'opacity-70' : ''}`} aria-busy={busy}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
          {thumbnail ? (
            <img src={thumbnail} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-zinc-400">
              <ImageSquareIcon size={24} aria-label={item.image ? 'Image saved' : 'No image'} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`font-medium ${item.is_available ? 'text-zinc-950' : 'text-zinc-400'}`}>{item.name}</p>
            {!item.is_available && <Badge tone="warning">Hidden</Badge>}
          </div>
          {item.description && <p className="line-clamp-1 text-sm text-zinc-500">{item.description}</p>}
        </div>

        <p className="font-mono text-sm font-medium text-zinc-950">${formatPrice(item.price_cents)}</p>

        <div className="flex flex-wrap items-center gap-1">
          <IconButton label="Move up" icon={<CaretUpIcon size={16} />} disabled={busy || isFirst} onClick={() => void run(() => actions.move(-1))} />
          <IconButton label="Move down" icon={<CaretDownIcon size={16} />} disabled={busy || isLast} onClick={() => void run(() => actions.move(1))} />
          <IconButton label="Edit" icon={<PencilSimpleIcon size={16} />} disabled={busy} onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')} />
          <IconButton
            label={item.is_available ? 'Hide from the tables' : 'Show on the tables'}
            icon={item.is_available ? <EyeIcon size={16} /> : <EyeSlashIcon size={16} />}
            disabled={busy}
            onClick={() => void run(() => actions.update({ is_available: !item.is_available }))}
          />
          <label
            title={item.image ? 'Change image' : 'Add image'}
            className={`inline-flex cursor-pointer items-center justify-center rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-zinc-950 ${MOTION} ${
              busy ? 'pointer-events-none opacity-40' : ''
            }`}
          >
            <UploadSimpleIcon size={16} aria-hidden />
            <span className="sr-only">{item.image ? 'Change image' : 'Add image'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={handleFile}
              className="sr-only"
            />
          </label>
          {item.image && (
            <IconButton label="Remove image" icon={<XIcon size={16} />} disabled={busy} onClick={() => void run(actions.removeImage)} />
          )}
          <IconButton label="Delete item" tone="danger" icon={<TrashIcon size={16} />} disabled={busy} onClick={() => setMode('confirm-delete')} />
        </div>
      </div>

      {mode === 'edit' && (
        <div className="mt-4 space-y-4">
          <Field label="Category" className="max-w-xs">
            <Select
              value={item.category_id}
              disabled={busy}
              onChange={(e) => void run(() => actions.update({ category_id: e.target.value }), true)}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <ItemForm
            initial={item}
            submitLabel="Save changes"
            onSubmit={(values) => run(() => actions.update(values), true)}
            onCancel={() => setMode('view')}
          />
        </div>
      )}

      {mode === 'confirm-delete' && (
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl bg-red-50 p-4">
          <p className="flex-1 text-sm text-red-800">
            Delete {item.name}? Its image is deleted too. This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button variant="danger" disabled={busy} onClick={() => void run(actions.remove, true)}>
              Delete item
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setMode('view')}>
              Keep it
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </li>
  )
}
