import { Field, Select } from '../../shared/ui/Field.tsx'
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
  chips: 'Chips that jump to each section',
  tabs: 'Tabs, one category at a time',
  sidebar: 'Side list, one category at a time',
  sections: 'One long page with a section bar',
}
const VIEW_LABELS: Record<ProductView, string> = { grid: 'Grid', list: 'List', carousel: 'Carousel (swipe)' }
const DENSITY_LABELS: Record<Density, string> = { compact: 'Compact', comfortable: 'Comfortable', spacious: 'Spacious' }
const HEADER_LABELS: Record<CategoryHeader, string> = {
  plain: 'Title with a dot',
  underline: 'Underlined title',
  band: 'Title on a colored band',
}
const CART_LABELS: Record<CartStyle, string> = {
  bar: 'Bottom bar (side panel on large screens)',
  panel: 'Side panel from tablets up',
  floating: 'Floating button in the corner',
}

const COLUMNS = Array.from({ length: MAX_COLUMNS - MIN_COLUMNS + 1 }, (_, index) => MIN_COLUMNS + index)

type Flag = 'sticky_header' | 'show_banner' | 'show_tagline' | 'show_welcome'

const FLAGS: { field: Flag; label: string }[] = [
  { field: 'sticky_header', label: 'Keep the top bar on screen while scrolling' },
  { field: 'show_banner', label: 'Show the banner' },
  { field: 'show_tagline', label: 'Show the tagline' },
  { field: 'show_welcome', label: 'Show the welcome message' },
]

interface ChoiceProps<T extends string> {
  label: string
  value: T
  options: T[]
  labels: Record<T, string>
  onChange: (value: T) => void
  hint?: string
}

function Choice<T extends string>({ label, value, options, labels, onChange, hint }: ChoiceProps<T>) {
  return (
    <Field label={label} hint={hint}>
      <Select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </Select>
    </Field>
  )
}

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
        label="Category navigation"
        value={layout.navigation}
        options={NAVIGATIONS}
        labels={NAVIGATION_LABELS}
        onChange={(navigation) => set({ navigation })}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Choice
          label="Products"
          value={layout.product_view}
          options={PRODUCT_VIEWS}
          labels={VIEW_LABELS}
          onChange={(product_view) => set({ product_view })}
        />
        <Field label="Columns" hint="On wide screens; tablets show up to three and phones one.">
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
          label="Spacing"
          value={layout.density}
          options={DENSITIES}
          labels={DENSITY_LABELS}
          onChange={(density) => set({ density })}
        />
        <Choice
          label="Category titles"
          value={layout.category_header}
          options={CATEGORY_HEADERS}
          labels={HEADER_LABELS}
          onChange={(category_header) => set({ category_header })}
        />
      </div>

      <Choice
        label="Table order"
        value={layout.cart}
        options={CART_STYLES}
        labels={CART_LABELS}
        onChange={(cart) => set({ cart })}
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-ink">Top of the menu</legend>
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
