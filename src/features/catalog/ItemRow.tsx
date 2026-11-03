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
import { buttonClass, MOTION } from '../../shared/ui/classes.ts'
import { Field, Select } from '../../shared/ui/Field.tsx'
import { Badge, ErrorText } from '../../shared/ui/Feedback.tsx'
import type { ModifierGroup } from '../modifiers/api.ts'
import type { CatalogItem, Category, ItemChanges } from './api.ts'
import { ItemForm } from './ItemForm.tsx'
import { formatMoney } from './price.ts'
import { useRowAction } from '../../shared/ui/useRowAction.ts'

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
  /** The modifier group library, or null when it could not load. */
  modifierGroups: ModifierGroup[] | null
  isFirst: boolean
  isLast: boolean
  actions: ItemActions
}

export function ItemRow({ item, categories, modifierGroups, isFirst, isLast, actions }: ItemRowProps) {
  const [mode, setMode] = useState<Mode>('view')
  const { busy, error, run: runAction } = useRowAction()

  /** `close` returns to the plain view on success; quick actions keep an open form as it is. */
  function run(action: () => Promise<string | null>, close = false): Promise<string | null> {
    return runAction(action, close ? () => setMode('view') : undefined)
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
              <ImageSquareIcon size={24} aria-label={item.image ? 'Imagen guardada' : 'Sin imagen'} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`font-medium ${item.is_available ? 'text-zinc-950' : 'text-zinc-400'}`}>{item.name}</p>
            {!item.is_available && <Badge tone="warning">Oculto</Badge>}
          </div>
          {item.description && <p className="line-clamp-1 text-sm text-zinc-500">{item.description}</p>}
        </div>

        <p className="font-mono text-sm font-medium text-zinc-950">{formatMoney(item.price_cents)}</p>

        <div className="flex flex-wrap items-center gap-1">
          <IconButton label="Subir" icon={<CaretUpIcon size={16} />} disabled={busy || isFirst} onClick={() => void run(() => actions.move(-1))} />
          <IconButton label="Bajar" icon={<CaretDownIcon size={16} />} disabled={busy || isLast} onClick={() => void run(() => actions.move(1))} />
          <IconButton label="Editar" icon={<PencilSimpleIcon size={16} />} disabled={busy} onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')} />
          <IconButton
            label={item.is_available ? 'Ocultar en las mesas' : 'Mostrar en las mesas'}
            icon={item.is_available ? <EyeIcon size={16} /> : <EyeSlashIcon size={16} />}
            disabled={busy}
            onClick={() => void run(() => actions.update({ is_available: !item.is_available }))}
          />
          {/* A labeled button, not just an icon: admins could not find where to upload a photo. */}
          <label
            className={`cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-zinc-950 ${buttonClass('secondary')} ${
              busy ? 'pointer-events-none opacity-40' : ''
            }`}
          >
            <UploadSimpleIcon size={16} aria-hidden />
            {item.image ? 'Cambiar imagen' : 'Subir imagen'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={handleFile}
              className="sr-only"
            />
          </label>
          {item.image && (
            <IconButton label="Quitar imagen" icon={<XIcon size={16} />} disabled={busy} onClick={() => void run(actions.removeImage)} />
          )}
          <IconButton label="Eliminar producto" tone="danger" icon={<TrashIcon size={16} />} disabled={busy} onClick={() => setMode('confirm-delete')} />
        </div>
      </div>

      {mode === 'edit' && (
        <div className="mt-4 space-y-4">
          <Field label="Categoría" className="max-w-xs">
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
            modifierGroups={modifierGroups}
            submitLabel="Guardar cambios"
            onSubmit={(values) => run(() => actions.update(values), true)}
            onCancel={() => setMode('view')}
          />
        </div>
      )}

      {mode === 'confirm-delete' && (
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl bg-red-50 p-4">
          <p className="flex-1 text-sm text-red-800">
            ¿Eliminar {item.name}? También se elimina su imagen. Esto no se puede deshacer.
          </p>
          <div className="flex gap-2">
            <Button variant="danger" disabled={busy} onClick={() => void run(actions.remove, true)}>
              Eliminar producto
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setMode('view')}>
              Conservarlo
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
