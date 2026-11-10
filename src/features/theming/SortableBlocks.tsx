import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDownIcon, ArrowUpIcon, DotsSixVerticalIcon } from '@phosphor-icons/react'
import { useId } from 'react'
import { MOTION } from '../../shared/ui/classes.ts'
import { IconButton } from '../../shared/ui/Button.tsx'
import { FOCUS_RING } from '../../components/ui/styles.ts'
import { moveBlock } from './blocks.ts'

interface RowProps {
  id: string
  label: string
  position: number
  count: number
  onMove: (to: number) => void
}

function Row({ id, label, position, count, onMove }: RowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    attributes: { roleDescription: 'bloque que se puede mover' },
  })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-xl border border-line bg-surface p-1 ${isDragging ? 'relative z-10 shadow-md' : ''}`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Arrastrar ${label}`}
        title="Arrastra para mover, o pulsa espacio y usa las flechas"
        className={`inline-flex cursor-grab touch-none items-center justify-center rounded-lg p-2 text-muted hover:bg-subtle hover:text-ink active:cursor-grabbing ${MOTION} ${FOCUS_RING}`}
        {...attributes}
        {...listeners}
      >
        <DotsSixVerticalIcon size={16} weight="bold" aria-hidden />
      </button>
      <span className="flex-1 text-sm font-medium text-ink">{label}</span>
      <IconButton label={`Subir ${label}`} icon={<ArrowUpIcon size={16} aria-hidden />} disabled={position === 0} onClick={() => onMove(position - 1)} />
      <IconButton
        label={`Bajar ${label}`}
        icon={<ArrowDownIcon size={16} aria-hidden />}
        disabled={position === count - 1}
        onClick={() => onMove(position + 1)}
      />
    </li>
  )
}

interface SortableBlocksProps<T extends string> {
  label: string
  hint?: string
  blocks: readonly T[]
  labels: Record<T, string>
  onChange: (blocks: T[]) => void
}

/**
 * A list of blocks put in order by dragging their handle, with the keyboard (space, then the arrows) or with the
 * up and down buttons of each row.
 */
export function SortableBlocks<T extends string>({ label, hint, blocks, labels, onChange }: SortableBlocksProps<T>) {
  const id = useId()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const name = (block: UniqueIdentifier) => labels[block as T] ?? String(block)
  const place = (block: UniqueIdentifier) => `${blocks.indexOf(block as T) + 1} de ${blocks.length}`
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Tomaste ${name(active.id)}, en el lugar ${place(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${name(active.id)} va al lugar ${place(over.id)}.` : `${name(active.id)} está fuera de la lista.`),
    onDragEnd: ({ active, over }) => (over ? `Dejaste ${name(active.id)} en el lugar ${place(over.id)}.` : `Dejaste ${name(active.id)} donde estaba.`),
    onDragCancel: ({ active }) => `Cancelaste. ${name(active.id)} volvió a su lugar.`,
  }
  const move = (from: number, to: number) => {
    const next = moveBlock(blocks, from, to)
    if (next.some((block, index) => block !== blocks[index])) onChange(next)
  }
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over) move(blocks.indexOf(active.id as T), blocks.indexOf(over.id as T))
  }

  return (
    <div className="space-y-2">
      <p id={`${id}-label`} className="text-sm font-semibold text-ink">
        {label}
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              'Para mover un bloque, pulsa espacio o Enter, usa las flechas arriba y abajo y pulsa espacio o Enter otra vez para dejarlo. Escape cancela.',
          },
        }}
      >
        <SortableContext items={[...blocks]} strategy={verticalListSortingStrategy}>
          <ol aria-labelledby={`${id}-label`} aria-describedby={hint ? `${id}-hint` : undefined} className="space-y-2">
            {blocks.map((block, position) => (
              <Row
                key={block}
                id={block}
                label={labels[block]}
                position={position}
                count={blocks.length}
                onMove={(to) => move(position, to)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
