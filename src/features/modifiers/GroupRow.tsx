import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button, IconButton } from '../../shared/ui/Button.tsx'
import { MOTION } from '../../shared/ui/classes.ts'
import { Badge, ErrorText } from '../../shared/ui/Feedback.tsx'
import { useRowAction } from '../../shared/ui/useRowAction.ts'
import { formatMoney } from '../catalog/price.ts'
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
    <li className={`rounded-lg p-3 hover:bg-zinc-50 ${MOTION} ${busy ? 'opacity-70' : ''}`} aria-busy={busy}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-zinc-950">{group.name}</p>
            <Badge>{selectionRule(group.min_select, group.max_select)}</Badge>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
            {group.options.map((option) => (
              <li key={option.id} className={option.is_available ? '' : 'text-zinc-400 line-through'}>
                {option.name}
                {option.price_cents > 0 && <span className="font-mono"> +{formatMoney(option.price_cents)}</span>}
                {!option.is_available && <span className="sr-only"> (sold out)</span>}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            label={`Edit ${group.name}`}
            icon={<PencilSimpleIcon size={16} />}
            disabled={busy}
            onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
          />
          <IconButton
            label={`Delete ${group.name}`}
            tone="danger"
            icon={<TrashIcon size={16} />}
            disabled={busy}
            onClick={() => setMode('confirm-delete')}
          />
        </div>
      </div>

      {mode === 'edit' && (
        <div className="mt-4">
          <GroupEditor
            initial={group}
            submitLabel="Save changes"
            onSubmit={(payload) => run(() => actions.update(payload), () => setMode('view'))}
            onCancel={() => setMode('view')}
          />
        </div>
      )}

      {mode === 'confirm-delete' && (
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl bg-red-50 p-4">
          <p className="flex-1 text-sm text-red-800">
            Delete {group.name}? Every item that uses it loses these choices. This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button variant="danger" disabled={busy} onClick={() => void run(actions.remove, () => setMode('view'))}>
              Delete group
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setMode('view')}>
              Keep it
            </Button>
          </div>
        </div>
      )}

      {error && mode !== 'edit' && (
        <div className="mt-2">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </li>
  )
}
