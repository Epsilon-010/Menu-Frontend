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
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DotsSixVerticalIcon,
  FlagBannerIcon,
  ForkKnifeIcon,
  MinusIcon,
  PlusIcon,
  StarIcon,
  TextTIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { FOCUS_RING } from '../../components/ui/styles.ts'
import { Button, IconButton } from '../../shared/ui/Button.tsx'
import { MOTION } from '../../shared/ui/classes.ts'
import { Field, TextArea, TextInput } from '../../shared/ui/Field.tsx'
import { fetchMenu, type MenuCategory } from '../ordering/api.ts'
import type { FeaturedSection, FeaturedView, MenuSection, SectionType, TextSection, TextSectionAlign, TextSectionStyle, Theme } from './api.ts'
import { Choice } from './Choice.tsx'
import {
  canAddSection,
  MAX_FEATURED_ITEMS,
  MAX_FEATURED_TITLE_LENGTH,
  MAX_SECTIONS,
  MAX_TEXT_BODY_LENGTH,
  MAX_TEXT_TITLE_LENGTH,
  newSection,
  SECTION_TEXT,
  sectionSummary,
  withSectionAdded,
  withSectionChanged,
  withSectionMoved,
  withoutSection,
  type AddableSectionType,
} from './sections.ts'

/** Other parts of the editor a section's settings live in. */
export type OtherPanel = 'brand' | 'layout' | 'cards'

// Keyed by every type: a new section cannot ship without its icon.
const ICONS: Record<SectionType, ReactNode> = {
  hero: <FlagBannerIcon size={18} aria-hidden />,
  menu: <ForkKnifeIcon size={18} aria-hidden />,
  featured: <StarIcon size={18} aria-hidden />,
  text: <TextTIcon size={18} aria-hidden />,
  divider: <MinusIcon size={18} aria-hidden />,
}
const SECTION_INFO = Object.fromEntries(
  (Object.keys(ICONS) as SectionType[]).map((type) => [type, { ...SECTION_TEXT[type], icon: ICONS[type] }]),
) as Record<SectionType, { name: string; hint: string; icon: ReactNode }>

const ADDABLE: AddableSectionType[] = ['featured', 'text', 'divider', 'hero']
const VIEW_LABELS: Record<FeaturedView, string> = { carousel: 'Carrusel (se desliza)', grid: 'Cuadrícula' }
const STYLE_LABELS: Record<TextSectionStyle, string> = { highlight: 'Destacado, con fondo de color', plain: 'Simple, sin fondo' }
const ALIGN_LABELS: Record<TextSectionAlign, string> = { center: 'Centrado', left: 'A la izquierda' }

interface RowProps {
  section: MenuSection
  position: number
  count: number
  selected: boolean
  onSelect: () => void
  onMove: (to: number) => void
  onRemove: () => void
}

function Row({ section, position, count, selected, onSelect, onMove, onRemove }: RowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    attributes: { roleDescription: 'sección que se puede mover' },
  })
  const { name, icon } = SECTION_INFO[section.type]
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-1 rounded-xl border bg-surface p-1 ${selected ? 'border-action ring-1 ring-action' : 'border-line'} ${
        isDragging ? 'relative z-10 shadow-md' : ''
      }`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Arrastrar ${name}`}
        title="Arrastra para mover, o pulsa espacio y usa las flechas"
        className={`inline-flex cursor-grab touch-none items-center justify-center rounded-lg p-2 text-muted hover:bg-subtle hover:text-ink active:cursor-grabbing ${MOTION} ${FOCUS_RING}`}
        {...attributes}
        {...listeners}
      >
        <DotsSixVerticalIcon size={16} weight="bold" aria-hidden />
      </button>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-subtle ${MOTION} ${FOCUS_RING}`}
      >
        <span className="text-muted">{icon}</span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink">{name}</span>
          <span className="block truncate text-xs text-muted">{sectionSummary(section)}</span>
        </span>
      </button>
      <IconButton label={`Subir ${name}`} icon={<ArrowUpIcon size={16} aria-hidden />} disabled={position === 0} onClick={() => onMove(position - 1)} />
      <IconButton label={`Bajar ${name}`} icon={<ArrowDownIcon size={16} aria-hidden />} disabled={position === count - 1} onClick={() => onMove(position + 1)} />
      {section.type !== 'menu' && <IconButton label={`Quitar ${name}`} tone="danger" icon={<TrashIcon size={16} aria-hidden />} onClick={onRemove} />}
    </li>
  )
}

function SectionList({ sections, selectedId, onSelect, onChange }: {
  sections: MenuSection[]
  selectedId: string | null
  onSelect: (id: string) => void
  onChange: (sections: MenuSection[]) => void
}) {
  const id = useId()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const indexOf = (key: UniqueIdentifier) => sections.findIndex((section) => section.id === key)
  const name = (key: UniqueIdentifier) => {
    const section = sections[indexOf(key)]
    return section ? SECTION_INFO[section.type].name : String(key)
  }
  const place = (key: UniqueIdentifier) => `${indexOf(key) + 1} de ${sections.length}`
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Tomaste ${name(active.id)}, en el lugar ${place(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${name(active.id)} va al lugar ${place(over.id)}.` : `${name(active.id)} está fuera de la lista.`),
    onDragEnd: ({ active, over }) => (over ? `Dejaste ${name(active.id)} en el lugar ${place(over.id)}.` : `Dejaste ${name(active.id)} donde estaba.`),
    onDragCancel: ({ active }) => `Cancelaste. ${name(active.id)} volvió a su lugar.`,
  }
  const move = (from: number, to: number) => {
    const next = withSectionMoved(sections, from, to)
    if (next.some((section, index) => section !== sections[index])) onChange(next)
  }
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over) move(indexOf(active.id), indexOf(over.id))
  }

  return (
    <div className="space-y-2">
      <p id={`${id}-label`} className="text-sm font-semibold text-ink">
        Secciones del menú, de arriba a abajo
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              'Para mover una sección, pulsa espacio o Enter, usa las flechas arriba y abajo y pulsa espacio o Enter otra vez para dejarla. Escape cancela.',
          },
        }}
      >
        <SortableContext items={sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
          <ol aria-labelledby={`${id}-label`} className="space-y-2">
            {sections.map((section, position) => (
              <Row
                key={section.id}
                section={section}
                position={position}
                count={sections.length}
                selected={section.id === selectedId}
                onSelect={() => onSelect(section.id)}
                onMove={(to) => move(position, to)}
                onRemove={() => onChange(withoutSection(sections, section.id))}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  )
}

function AddGallery({ sections, onAdd }: { sections: MenuSection[]; onAdd: (type: AddableSectionType) => void }) {
  const options = ADDABLE.filter((type) => type !== 'hero' || canAddSection(sections, 'hero'))
  const full = sections.length >= MAX_SECTIONS
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-ink">Agregar una sección</p>
      {full && <p className="text-xs text-muted">Llegaste al máximo de {MAX_SECTIONS} secciones. Quita una para agregar otra.</p>}
      <div className="grid gap-2 @sm:grid-cols-2">
        {options.map((type) => {
          const { name, hint, icon } = SECTION_INFO[type]
          return (
            <button
              key={type}
              type="button"
              disabled={full}
              onClick={() => onAdd(type)}
              className={`flex items-start gap-3 rounded-xl border border-dashed border-line-strong p-3 text-left hover:border-action hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50 ${MOTION} ${FOCUS_RING}`}
            >
              <span className="mt-0.5 text-action">{icon}</span>
              <span>
                <span className="flex items-center gap-1 text-sm font-semibold text-ink">
                  <PlusIcon size={12} weight="bold" aria-hidden />
                  {name}
                </span>
                <span className="block text-xs text-muted">{hint}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ProductPicker({ section, onChange }: { section: FeaturedSection; onChange: (itemIds: string[]) => void }) {
  const [menu, setMenu] = useState<MenuCategory[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    fetchMenu()
      .then((categories) => active && setMenu(categories))
      .catch(() => active && setFailed(true))
    return () => {
      active = false
    }
  }, [])
  const picked = section.item_ids
  const full = picked.length >= MAX_FEATURED_ITEMS
  const toggle = (itemId: string, on: boolean) => onChange(on ? [...picked, itemId] : picked.filter((id) => id !== itemId))

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-ink">Productos</legend>
      <p className="text-xs text-muted">
        Elegiste {picked.length} de {MAX_FEATURED_ITEMS}. Se muestran en el orden en que los marcas.
      </p>
      {failed && <p className="text-sm text-muted">No se pudo cargar el menú. Recarga la página para elegir productos.</p>}
      {menu?.length === 0 && <p className="text-sm text-muted">Aún no tienes productos en el menú.</p>}
      <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl border border-line p-3">
        {menu?.map((category) => (
          <div key={category.id} className="space-y-1">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">{category.name}</p>
            {category.items.map((item) => {
              const checked = picked.includes(item.id)
              return (
                <label key={item.id} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && full}
                    onChange={(event) => toggle(item.id, event.target.checked)}
                    className="h-4 w-4 accent-[var(--color-action)]"
                  />
                  {item.name}
                </label>
              )
            })}
          </div>
        ))}
      </div>
    </fieldset>
  )
}

function FeaturedSettings({ section, onChange }: { section: FeaturedSection; onChange: (changes: Partial<FeaturedSection>) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Título" hint="Por ejemplo: Lo más pedido, Recomendados del chef. Déjalo vacío para no mostrarlo.">
        <TextInput value={section.title} maxLength={MAX_FEATURED_TITLE_LENGTH} onChange={(event) => onChange({ title: event.target.value })} />
      </Field>
      <Choice label="Cómo se muestran" value={section.view} options={['carousel', 'grid']} labels={VIEW_LABELS} onChange={(view) => onChange({ view })} />
      <ProductPicker section={section} onChange={(item_ids) => onChange({ item_ids })} />
    </div>
  )
}

function TextSettings({ section, onChange }: { section: TextSection; onChange: (changes: Partial<TextSection>) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Título">
        <TextInput value={section.title} maxLength={MAX_TEXT_TITLE_LENGTH} onChange={(event) => onChange({ title: event.target.value })} />
      </Field>
      <Field label="Mensaje" hint={`Hasta ${MAX_TEXT_BODY_LENGTH} caracteres.`}>
        <TextArea rows={4} value={section.body} maxLength={MAX_TEXT_BODY_LENGTH} onChange={(event) => onChange({ body: event.target.value })} />
      </Field>
      <Choice label="Estilo" value={section.style} options={['highlight', 'plain']} labels={STYLE_LABELS} onChange={(style) => onChange({ style })} />
      <details className="group rounded-xl border border-line p-3">
        <summary className="cursor-pointer text-sm font-semibold text-ink">Más opciones</summary>
        <div className="mt-3">
          <Choice label="Alineación" value={section.align} options={['center', 'left']} labels={ALIGN_LABELS} onChange={(align) => onChange({ align })} />
        </div>
      </details>
    </div>
  )
}

function SectionSettings({ section, onChange, onOpen }: {
  section: MenuSection
  onChange: (changes: Partial<MenuSection>) => void
  onOpen: (panel: OtherPanel) => void
}) {
  switch (section.type) {
    case 'featured':
      return <FeaturedSettings section={section} onChange={onChange} />
    case 'text':
      return <TextSettings section={section} onChange={onChange} />
    case 'hero':
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted">El encabezado muestra tu banner, nombre, eslogan y mensaje de bienvenida.</p>
          <Button onClick={() => onOpen('brand')}>Cambiar textos e imágenes</Button>
        </div>
      )
    case 'menu':
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted">Aquí aparecen tus categorías y productos. Siempre está en la página.</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onOpen('layout')}>Cambiar la distribución</Button>
            <Button onClick={() => onOpen('cards')}>Cambiar las tarjetas</Button>
          </div>
        </div>
      )
    case 'divider':
      return <p className="text-sm text-muted">Una línea para separar las secciones. No tiene opciones.</p>
  }
}

interface PageControlsProps {
  theme: Theme
  onChange: (theme: Theme) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
  onOpen: (panel: OtherPanel) => void
}

/** The menu page as a list of sections: drag to reorder, add prefabricated ones, and edit the selected one. */
export function PageControls({ theme, onChange, selectedId, onSelect, onOpen }: PageControlsProps) {
  const { sections } = theme.layout
  const selected = sections.find((section) => section.id === selectedId) ?? null
  const setSections = (next: MenuSection[]) => onChange({ ...theme, layout: { ...theme.layout, sections: next } })

  function add(type: AddableSectionType) {
    const section = newSection(type)
    setSections(withSectionAdded(sections, section, selected?.id))
    onSelect(section.id)
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Toca una sección para editarla, aquí o en la vista previa. Arrástrala para cambiarla de lugar.
      </p>
      <SectionList
        sections={sections}
        selectedId={selected?.id ?? null}
        onSelect={onSelect}
        onChange={(next) => {
          setSections(next)
          if (selected && !next.some((section) => section.id === selected.id)) onSelect(null)
        }}
      />
      {selected && (
        <section aria-label={`Editar ${SECTION_INFO[selected.type].name}`} className="space-y-3 rounded-xl bg-subtle p-4">
          <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
            {SECTION_INFO[selected.type].icon}
            {SECTION_INFO[selected.type].name}
          </h3>
          <SectionSettings section={selected} onChange={(changes) => setSections(withSectionChanged(sections, selected.id, changes))} onOpen={onOpen} />
        </section>
      )}
      <AddGallery sections={sections} onAdd={add} />
    </div>
  )
}
