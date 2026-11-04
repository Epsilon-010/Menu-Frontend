import { useEffect, useId, useState } from 'react'
import { Skeleton } from '../../shared/ui/Feedback.tsx'
import { fetchMenu } from '../ordering/api.ts'
import type { CardTemplate, CategoryLayout, ProductView, Theme } from './api.ts'
import { CARD_TEMPLATES } from './cards.ts'
import { Choice, SwitchField } from './Choice.tsx'
import { generalCategoryLayout, withCategoryLayout } from './editor.ts'
import { categoryLayout, MAX_COLUMNS, MIN_COLUMNS, PRODUCT_VIEWS } from './layout.ts'

// Records keyed by every option: a new option cannot ship without its label.
const VIEW_LABELS: Record<ProductView, string> = { grid: 'Cuadrícula', list: 'Lista', carousel: 'Carrusel' }
const TEMPLATE_LABELS: Record<CardTemplate, string> = { vertical: 'Vertical', horizontal: 'Horizontal', overlay: 'Imagen completa' }
const COLUMNS = Array.from({ length: MAX_COLUMNS - MIN_COLUMNS + 1 }, (_, index) => String(MIN_COLUMNS + index))
const COLUMN_LABELS: Record<string, string> = Object.fromEntries(COLUMNS.map((columns) => [columns, columns]))

/** A category the admin can give its own design (only its id and name matter here). */
export interface DesignableCategory {
  id: string
  name: string
}

interface CategoryLayoutListProps {
  theme: Theme
  categories: DesignableCategory[]
  onChange: (theme: Theme) => void
}

/** Each category with a switch for its own design and, when on, its view, columns and card template. */
export function CategoryLayoutList({ theme, categories, onChange }: CategoryLayoutListProps) {
  if (categories.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line-strong p-4 text-sm text-muted">
        Cuando tengas categorías con productos disponibles, aparecerán aquí para darles un diseño propio.
      </p>
    )
  }
  return (
    <ul className="space-y-3">
      {categories.map((category) => {
        const own = categoryLayout(theme.layout, category.id)
        const set = (value: CategoryLayout | null) => onChange(withCategoryLayout(theme, category.id, value))
        return (
          <li key={category.id}>
            <fieldset className="space-y-4 rounded-xl border border-line p-4">
              <legend className="sr-only">{category.name}</legend>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p aria-hidden className="text-sm font-semibold text-ink">
                  {category.name}
                </p>
                <SwitchField
                  label="Diseño propio"
                  checked={own !== null}
                  onChange={(checked) => set(checked ? generalCategoryLayout(theme) : null)}
                />
              </div>
              {own && (
                <div className="grid gap-4 @sm:grid-cols-2">
                  <Choice
                    label="Vista"
                    value={own.product_view}
                    options={PRODUCT_VIEWS}
                    labels={VIEW_LABELS}
                    onChange={(product_view) => set({ ...own, product_view })}
                  />
                  <Choice
                    label="Columnas"
                    kind="segmented"
                    value={String(own.columns)}
                    options={COLUMNS}
                    labels={COLUMN_LABELS}
                    disabled={own.product_view !== 'grid'}
                    onChange={(columns) => set({ ...own, columns: Number(columns) })}
                  />
                  <Choice
                    label="Plantilla de tarjeta"
                    value={own.card_template}
                    options={CARD_TEMPLATES}
                    labels={TEMPLATE_LABELS}
                    disabled={own.product_view === 'list'}
                    hint={own.product_view === 'list' ? 'La lista siempre muestra filas horizontales.' : undefined}
                    onChange={(card_template) => set({ ...own, card_template })}
                  />
                </div>
              )}
            </fieldset>
          </li>
        )
      })}
    </ul>
  )
}

interface CategoryLayoutControlsProps {
  theme: Theme
  onChange: (theme: Theme) => void
}

/**
 * Per category: its own product view, columns and card template instead of the general ones. Lists the categories
 * the menu shows (the same menu the preview draws); the others keep whatever design they had.
 */
export function CategoryLayoutControls({ theme, onChange }: CategoryLayoutControlsProps) {
  const [categories, setCategories] = useState<DesignableCategory[] | null>(null)
  const [failed, setFailed] = useState(false)
  const headingId = useId()

  useEffect(() => {
    let active = true
    fetchMenu()
      .then((menu) => active && setCategories(menu.map(({ id, name }) => ({ id, name }))))
      .catch(() => active && setFailed(true))
    return () => {
      active = false
    }
  }, [])

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div className="space-y-1">
        <h3 id={headingId} className="text-sm font-semibold text-ink">
          Por categoría
        </h3>
        <p className="text-xs text-muted">
          Dale a una categoría su propia vista, columnas y plantilla de tarjeta. Las demás usan el diseño general.
        </p>
      </div>
      {failed ? (
        <p className="text-sm text-muted">No se pudieron cargar tus categorías. Recarga la página para intentarlo de nuevo.</p>
      ) : categories === null ? (
        <div role="status" aria-label="Cargando categorías" className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : (
        <CategoryLayoutList theme={theme} categories={categories} onChange={onChange} />
      )}
    </section>
  )
}
