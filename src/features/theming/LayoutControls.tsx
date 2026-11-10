import { CategoryLayoutControls } from './CategoryLayoutControls.tsx'
import { Choice, SwitchField } from './Choice.tsx'
import type { CartStyle, CategoryHeader, Density, HeaderBlock, Navigation, ProductView, Theme, ThemeLayout } from './api.ts'
import { withHeaderBlocks, withLayout } from './editor.ts'
import { SortableBlocks } from './SortableBlocks.tsx'
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

const COLUMNS = Array.from({ length: MAX_COLUMNS - MIN_COLUMNS + 1 }, (_, index) => String(MIN_COLUMNS + index))
const COLUMN_LABELS: Record<string, string> = Object.fromEntries(COLUMNS.map((columns) => [columns, columns]))

const HEADER_BLOCK_LABELS: Record<HeaderBlock, string> = {
  banner: 'Banner',
  name: 'Nombre y logo',
  tagline: 'Eslogan',
  welcome: 'Mensaje de bienvenida',
}

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

/**
 * How the menu is arranged: category navigation, product view, spacing, sections shown and their order, the cart,
 * and the categories with a design of their own.
 */
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
        <Choice
          label="Columnas"
          hint="En pantallas anchas; las tablets muestran hasta tres y los celulares una."
          kind="segmented"
          value={String(layout.columns)}
          options={COLUMNS}
          labels={COLUMN_LABELS}
          disabled={layout.product_view !== 'grid'}
          onChange={(columns) => set({ columns: Number(columns) })}
        />
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

      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm font-semibold text-ink">Parte superior del menú</legend>
        {FLAGS.map(({ field, label }) => (
          <SwitchField key={field} label={label} checked={layout[field]} onChange={(checked) => set({ [field]: checked })} />
        ))}
      </fieldset>

      <SortableBlocks
        label="Orden del encabezado"
        hint="El logo siempre va con el nombre. Lo que ocultes arriba no aparece, aunque conserve su lugar."
        blocks={layout.header_blocks}
        labels={HEADER_BLOCK_LABELS}
        onChange={(blocks) => onChange(withHeaderBlocks(theme, blocks))}
      />

      <CategoryLayoutControls theme={theme} onChange={onChange} />
    </div>
  )
}
