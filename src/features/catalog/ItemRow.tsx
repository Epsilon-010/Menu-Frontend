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
import { DropdownMenuItem, DropdownMenuSeparator } from '../../components/ui/dropdown-menu.tsx'
import { Button } from '../../shared/ui/Button.tsx'
import { buttonClass, MOTION } from '../../shared/ui/classes.ts'
import { Badge, ErrorText } from '../../shared/ui/Feedback.tsx'
import type { ModifierGroup } from '../modifiers/api.ts'
import type { CatalogItem, Category, ItemChanges } from './api.ts'
import { ItemForm } from './ItemForm.tsx'
import { formatMoney } from './price.ts'
import { ConfirmDialog, MoreActionsMenu, SelectField, TooltipIconButton } from '../../shared/ui/RowActions.tsx'
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
    <li className={`rounded-lg p-3 hover:bg-canvas ${MOTION} ${busy ? 'opacity-70' : ''}`} aria-busy={busy}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-subtle">
          {thumbnail ? (
            <img src={thumbnail} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-faint">
              <ImageSquareIcon size={24} aria-label={item.image ? 'Imagen guardada' : 'Sin imagen'} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`font-medium wrap-anywhere ${item.is_available ? 'text-ink' : 'text-faint'}`}>{item.name}</p>
            {!item.is_available && <Badge tone="warning">Oculto</Badge>}
          </div>
          {item.description && <p className="line-clamp-1 text-sm text-muted">{item.description}</p>}
        </div>

        <p className="text-sm font-semibold text-ink tabular-nums">{formatMoney(item.price_cents)}</p>

        <div className="flex flex-wrap items-center gap-1">
          <Button
            icon={<PencilSimpleIcon size={16} aria-hidden />}
            variant={mode === 'edit' ? 'primary' : 'secondary'}
            aria-pressed={mode === 'edit'}
            disabled={busy}
            onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
          >
            Editar
          </Button>
          {/* A labeled button, not just an icon: admins could not find where to upload a photo. */}
          <label
            className={`cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-action/50 has-[:focus-visible]:ring-offset-2 ${buttonClass('secondary')} ${
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
          <TooltipIconButton
            label={item.is_available ? 'Ocultar en las mesas' : 'Mostrar en las mesas'}
            icon={item.is_available ? <EyeIcon size={16} aria-hidden /> : <EyeSlashIcon size={16} aria-hidden />}
            disabled={busy}
            onClick={() => void run(() => actions.update({ is_available: !item.is_available }))}
          />
          <MoreActionsMenu label={`Más acciones de ${item.name}`} disabled={busy}>
            <DropdownMenuItem disabled={isFirst} onSelect={() => void run(() => actions.move(-1))}>
              <CaretUpIcon size={16} aria-hidden />
              Subir
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isLast} onSelect={() => void run(() => actions.move(1))}>
              <CaretDownIcon size={16} aria-hidden />
              Bajar
            </DropdownMenuItem>
            {item.image && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void run(actions.removeImage)}>
                  <XIcon size={16} aria-hidden />
                  Quitar imagen
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem tone="danger" onSelect={() => setMode('confirm-delete')}>
              <TrashIcon size={16} aria-hidden />
              Eliminar producto
            </DropdownMenuItem>
          </MoreActionsMenu>
        </div>
      </div>

      {mode === 'edit' && (
        <div className="mt-4 space-y-4">
          <SelectField
            label="Categoría"
            className="max-w-xs"
            value={item.category_id}
            disabled={busy}
            options={categories.map((category) => ({ value: category.id, label: category.name }))}
            onChange={(categoryId) => void run(() => actions.update({ category_id: categoryId }), true)}
          />
          <ItemForm
            initial={item}
            modifierGroups={modifierGroups}
            submitLabel="Guardar cambios"
            onSubmit={(values) => run(() => actions.update(values), true)}
            onCancel={() => setMode('view')}
          />
        </div>
      )}

      <ConfirmDialog
        open={mode === 'confirm-delete'}
        onCancel={() => setMode('view')}
        title="Eliminar producto"
        cancelLabel="Conservarlo"
        confirmLabel="Eliminar producto"
        confirmVariant="danger"
        onConfirm={() => void run(actions.remove, true)}
        busy={busy}
        error={error}
      >
        ¿Eliminar {item.name}? También se elimina su imagen. Esto no se puede deshacer.
      </ConfirmDialog>

      {error && mode !== 'confirm-delete' && (
        <div className="mt-2">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </li>
  )
}
