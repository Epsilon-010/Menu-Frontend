import { Field, Select } from '../../shared/ui/Field.tsx'
import { Choice } from './Choice.tsx'
import type { CartStyle, CategoryHeader, Density, Navigation, ProductView, Theme, ThemeLayout } from './api.ts'
import { withLayout } from './editor.ts'
import {
  CART_STYLES,
  CATEGORY_HEADERS,
  DENSITIES,
  MAX_COLUMNS,
  MIN_COLUMNS,
  NAVIGATIONS,
  PRODUCT_VIEWS,
} from './layout.ts'

// Records keyed by every option: a new option cannot ship without its label.
const NAVIGATION_LABELS: Record<Navigation, string> = {
  chips: 'Chips que llevan a cada sección',
  tabs: 'Pestañas, una categoría a la vez',
  sidebar: 'Lista lateral, una categoría a la vez',
  sections: 'Una página larga con barra de secciones',
}
const VIEW_LABELS: Record<ProductView, string> = { grid: 'Cuadrícula', list: 'Lista', carousel: 'Carrusel (deslizar)' }
const DENSITY_LABELS: Record<Density, string> = { compact: 'Compacto', comfortable: 'Cómodo', spacious: 'Amplio' }
const HEADER_LABELS: Record<CategoryHeader, string> = {
  plain: 'Título con un punto',
  underline: 'Título subrayado',
  band: 'Título sobre una franja de color',
}
const CART_LABELS: Record<CartStyle, string> = {
  bar: 'Barra inferior (panel lateral en pantallas grandes)',
  panel: 'Panel lateral desde tablets',
  floating: 'Botón flotante en la esquina',
}

const COLUMNS = Array.from({ length: MAX_COLUMNS - MIN_COLUMNS + 1 }, (_, index) => MIN_COLUMNS + index)

type Flag = 'sticky_header' | 'show_banner' | 'show_tagline' | 'show_welcome'

const FLAGS: { field: Flag; label: string }[] = [
  { field: 'sticky_header', label: 'Mantener la barra superior visible al desplazarse' },
  { field: 'show_banner', label: 'Mostrar el banner' },
  { field: 'show_tagline', label: 'Mostrar el eslogan' },
  { field: 'show_welcome', label: 'Mostrar el mensaje de bienvenida' },
]

interface LayoutControlsProps {
  theme: Theme
  onChange: (theme: Theme) => void
}

/** How the menu is arranged: category navigation, product view, spacing, sections shown and the cart. */
export function LayoutControls({ theme, onChange }: LayoutControlsProps) {
  const { layout } = theme
  const set = (changes: Partial<ThemeLayout>) => onChange(withLayout(theme, changes))

  return (
    <div className="space-y-6">
      <Choice
        label="Navegación de categorías"
        value={layout.navigation}
        options={NAVIGATIONS}
        labels={NAVIGATION_LABELS}
        onChange={(navigation) => set({ navigation })}
      />

      <div className="grid gap-4 @sm:grid-cols-2">
        <Choice
          label="Productos"
          value={layout.product_view}
          options={PRODUCT_VIEWS}
          labels={VIEW_LABELS}
          onChange={(product_view) => set({ product_view })}
        />
        <Field label="Columnas" hint="En pantallas anchas; las tablets muestran hasta tres y los celulares una.">
          <Select
            value={layout.columns}
            disabled={layout.product_view !== 'grid'}
            onChange={(event) => set({ columns: Number(event.target.value) })}
          >
            {COLUMNS.map((columns) => (
              <option key={columns} value={columns}>
                {columns}
              </option>
            ))}
          </Select>
        </Field>
        <Choice
          label="Espaciado"
          value={layout.density}
          options={DENSITIES}
          labels={DENSITY_LABELS}
          onChange={(density) => set({ density })}
        />
        <Choice
          label="Títulos de categoría"
          value={layout.category_header}
          options={CATEGORY_HEADERS}
          labels={HEADER_LABELS}
          onChange={(category_header) => set({ category_header })}
        />
      </div>

      <Choice
        label="Pedido de la mesa"
        value={layout.cart}
        options={CART_STYLES}
        labels={CART_LABELS}
        onChange={(cart) => set({ cart })}
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-ink">Parte superior del menú</legend>
        {FLAGS.map(({ field, label }) => (
          <label key={field} className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={layout[field]}
              onChange={(event) => set({ [field]: event.target.checked })}
              className="h-4 w-4 accent-zinc-950"
            />
            {label}
          </label>
        ))}
      </fieldset>
    </div>
  )
}
