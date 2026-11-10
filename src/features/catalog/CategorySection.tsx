import {
  BowlFoodIcon,
  CaretDownIcon,
  CaretUpIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { DropdownMenuItem, DropdownMenuSeparator } from '../../components/ui/dropdown-menu.tsx'
import { Button } from '../../shared/ui/Button.tsx'
import { TextInput } from '../../shared/ui/Field.tsx'
import { Badge, ErrorText } from '../../shared/ui/Feedback.tsx'
import { Card } from '../../shared/ui/Section.tsx'
import type { ModifierGroup } from '../modifiers/api.ts'
import type { Category, CategoryChanges, CategoryWithItems } from './api.ts'
import { ItemForm, type ItemFormValues } from './ItemForm.tsx'
import { ItemRow, type ItemActions } from './ItemRow.tsx'
import { ConfirmDialog, MoreActionsMenu, TooltipIconButton } from '../../shared/ui/RowActions.tsx'
import { createDraftIds } from '../../shared/api/idempotency.ts'
import { useRowAction } from '../../shared/ui/useRowAction.ts'

type Mode = { kind: 'view' } | { kind: 'rename'; name: string } | { kind: 'add-item' } | { kind: 'confirm-delete' }

/** Every action resolves to an error message, or null on success. */
export interface CategoryActions {
  update: (changes: CategoryChanges) => Promise<string | null>
  move: (delta: -1 | 1) => Promise<string | null>
  remove: () => Promise<string | null>
  /** `id` identifies the new item: the same id on a retry returns the item instead of a duplicate. */
  addItem: (values: ItemFormValues, id: string) => Promise<string | null>
  itemActions: (itemId: string) => ItemActions
}

interface CategorySectionProps {
  category: CategoryWithItems
  categories: Category[]
  /** The modifier group library, or null when it could not load. */
  modifierGroups: ModifierGroup[] | null
  isFirst: boolean
  isLast: boolean
  actions: CategoryActions
}

export function CategorySection({ category, categories, modifierGroups, isFirst, isLast, actions }: CategorySectionProps) {
  const [mode, setMode] = useState<Mode>({ kind: 'view' })
  const { busy, error, run: runAction } = useRowAction()
  // Client ids for new items: a retry of the same values reuses its id, edited values get a new one.
  const [itemDrafts] = useState(() => createDraftIds())

  /** `close` returns to the plain view on success; quick actions keep an open form as it is. */
  function run(action: () => Promise<string | null>, close = false): Promise<string | null> {
    return runAction(action, close ? () => setMode({ kind: 'view' }) : undefined)
  }

  function addItem(values: ItemFormValues): Promise<string | null> {
    return runAction(
      () => actions.addItem(values, itemDrafts.idFor(JSON.stringify(values))),
      () => {
        itemDrafts.reset()
        setMode({ kind: 'view' })
      },
    )
  }

  function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode.kind === 'rename') void run(() => actions.update({ name: mode.name }), true)
  }

  const { items } = category
  const count = items.length === 1 ? '1 producto' : `${items.length} productos`

  return (
    <Card className="p-2">
      <header className="space-y-4 p-2">
        {mode.kind === 'rename' ? (
          <form onSubmit={handleRename} className="flex flex-wrap items-center gap-2">
            <TextInput
              aria-label="Nombre de la categoría"
              required
              maxLength={60}
              autoFocus
              value={mode.name}
              onChange={(e) => setMode({ kind: 'rename', name: e.target.value })}
              className="max-w-xs"
            />
            <Button type="submit" variant="primary" disabled={busy}>
              Guardar
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setMode({ kind: 'view' })}>
              Cancelar
            </Button>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={`text-lg font-semibold ${category.is_visible ? 'text-ink' : 'text-faint'}`}>
                {category.name}
              </h2>
              <span className="text-sm text-muted">{count}</span>
              {!category.is_visible && <Badge tone="warning">Oculta</Badge>}
            </div>
            <div className="flex items-center gap-1">
              <TooltipIconButton
                label="Cambiar nombre de la categoría"
                icon={<PencilSimpleIcon size={16} aria-hidden />}
                disabled={busy}
                onClick={() => setMode({ kind: 'rename', name: category.name })}
              />
              <TooltipIconButton
                label={category.is_visible ? 'Ocultar categoría en las mesas' : 'Mostrar categoría en las mesas'}
                icon={category.is_visible ? <EyeIcon size={16} aria-hidden /> : <EyeSlashIcon size={16} aria-hidden />}
                disabled={busy}
                onClick={() => void run(() => actions.update({ is_visible: !category.is_visible }))}
              />
              <MoreActionsMenu label={`Más acciones de ${category.name}`} disabled={busy}>
                <DropdownMenuItem disabled={isFirst} onSelect={() => void run(() => actions.move(-1))}>
                  <CaretUpIcon size={16} aria-hidden />
                  Subir categoría
                </DropdownMenuItem>
                <DropdownMenuItem disabled={isLast} onSelect={() => void run(() => actions.move(1))}>
                  <CaretDownIcon size={16} aria-hidden />
                  Bajar categoría
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem tone="danger" onSelect={() => setMode({ kind: 'confirm-delete' })}>
                  <TrashIcon size={16} aria-hidden />
                  Eliminar categoría
                </DropdownMenuItem>
              </MoreActionsMenu>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={mode.kind === 'confirm-delete'}
          onCancel={() => setMode({ kind: 'view' })}
          title={items.length > 0 ? 'Esta categoría aún tiene productos' : 'Eliminar categoría'}
          cancelLabel={items.length === 0 ? 'Conservarla' : 'Entendido'}
          confirmLabel={items.length === 0 ? 'Eliminar categoría' : undefined}
          confirmVariant="danger"
          onConfirm={() => void run(actions.remove, true)}
          busy={busy}
          error={error}
        >
          {items.length > 0
            ? `${category.name} todavía tiene ${count}. Muévelos o elimínalos primero.`
            : `¿Eliminar la categoría ${category.name}? Esto no se puede deshacer.`}
        </ConfirmDialog>
        {error && mode.kind !== 'confirm-delete' && <ErrorText>{error}</ErrorText>}
      </header>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg bg-canvas p-4 text-sm text-muted">
          <BowlFoodIcon size={20} aria-hidden />
          Esta categoría aún no tiene productos. Agrega el primero abajo.
        </div>
      ) : (
        <ul className="space-y-1">
          {items.map((item, index) => (
            <ItemRow
              key={item.id}
              item={item}
              categories={categories}
              modifierGroups={modifierGroups}
              isFirst={index === 0}
              isLast={index === items.length - 1}
              actions={actions.itemActions(item.id)}
            />
          ))}
        </ul>
      )}

      <div className="p-2">
        {mode.kind === 'add-item' ? (
          <ItemForm
            submitLabel="Agregar producto"
            modifierGroups={modifierGroups}
            onSubmit={addItem}
            onCancel={() => {
              itemDrafts.reset()
              setMode({ kind: 'view' })
            }}
          />
        ) : (
          <Button variant="ghost" icon={<PlusIcon size={16} aria-hidden />} disabled={busy} onClick={() => setMode({ kind: 'add-item' })}>
            Agregar producto
          </Button>
        )}
      </div>
    </Card>
  )
}
