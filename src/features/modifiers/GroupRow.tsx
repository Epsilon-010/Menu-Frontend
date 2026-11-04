import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { MOTION } from '../../shared/ui/classes.ts'
import { Badge, ErrorText } from '../../shared/ui/Feedback.tsx'
import { useRowAction } from '../../shared/ui/useRowAction.ts'
import { formatMoney } from '../catalog/price.ts'
import { ConfirmDialog, TooltipIconButton } from '../../shared/ui/RowActions.tsx'
import type { ModifierGroup } from './api.ts'
import { GroupEditor } from './GroupEditor.tsx'
import { selectionRule, type GroupPayload } from './logic.ts'

/** Every action resolves to an error message, or null on success. */
export interface GroupActions {
  update: (payload: GroupPayload) => Promise<string | null>
  remove: () => Promise<string | null>
}

type Mode = 'view' | 'edit' | 'confirm-delete'

export function GroupRow({ group, actions }: { group: ModifierGroup; actions: GroupActions }) {
  const [mode, setMode] = useState<Mode>('view')
  const { busy, error, run } = useRowAction()

  return (
    <li className={`rounded-lg p-3 hover:bg-canvas ${MOTION} ${busy ? 'opacity-70' : ''}`} aria-busy={busy}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-ink">{group.name}</p>
            <Badge>{selectionRule(group.min_select, group.max_select)}</Badge>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {group.options.map((option) => (
              <li key={option.id} className={option.is_available ? '' : 'text-faint line-through'}>
                {option.name}
                {option.price_cents > 0 && <span className="font-mono"> +{formatMoney(option.price_cents)}</span>}
                {!option.is_available && <span className="sr-only"> (agotado)</span>}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-1">
          <Button
            icon={<PencilSimpleIcon size={16} aria-hidden />}
            variant={mode === 'edit' ? 'primary' : 'secondary'}
            aria-label={`Editar ${group.name}`}
            aria-pressed={mode === 'edit'}
            disabled={busy}
            onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
          >
            Editar
          </Button>
          <TooltipIconButton
            label={`Eliminar ${group.name}`}
            icon={<TrashIcon size={16} aria-hidden />}
            disabled={busy}
            onClick={() => setMode('confirm-delete')}
          />
        </div>
      </div>

      {mode === 'edit' && (
        <div className="mt-4">
          <GroupEditor
            initial={group}
            submitLabel="Guardar cambios"
            onSubmit={(payload) => run(() => actions.update(payload), () => setMode('view'))}
            onCancel={() => setMode('view')}
          />
        </div>
      )}

      <ConfirmDialog
        open={mode === 'confirm-delete'}
        onCancel={() => setMode('view')}
        title="Eliminar grupo"
        cancelLabel="Conservarlo"
        confirmLabel="Eliminar grupo"
        confirmVariant="danger"
        onConfirm={() => void run(actions.remove, () => setMode('view'))}
        busy={busy}
        error={error}
      >
        ¿Eliminar {group.name}? Cada producto que lo usa pierde estas opciones. Esto no se puede deshacer.
      </ConfirmDialog>

      {error && mode === 'view' && (
        <div className="mt-2">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </li>
  )
}
