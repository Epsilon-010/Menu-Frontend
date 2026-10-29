import { CheckCircleIcon } from '@phosphor-icons/react'
import type { CSSProperties } from 'react'
import { MOTION } from '../../shared/ui/classes.ts'
import type { TextElement, ThemePreset } from './api.ts'
import { googleFontsUrl, typographyVariables } from './typography.ts'
import { useFontStylesheet } from './useFontStylesheet.ts'

/** The family, weight and case an element has in the preset (sizes stay small to fit the card). */
function face(preset: ThemePreset, element: TextElement, color: string): CSSProperties {
  const style = preset.typography.elements[element]
  return {
    color,
    fontFamily: typographyVariables(preset.typography)[`--type-${element.replaceAll('_', '-')}-family`],
    fontWeight: style.weight,
    fontStyle: style.style,
    textTransform: style.transform,
  }
}

interface PresetCardProps {
  preset: ThemePreset
  selected: boolean
  onApply: () => void
}

/** A small sample of the preset drawn with its own colors and fonts (all validated values from the server). */
function PresetCard({ preset, selected, onApply }: PresetCardProps) {
  useFontStylesheet(googleFontsUrl(preset.typography))
  const { colors } = preset

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onApply}
      className={`group flex flex-col overflow-hidden rounded-2xl border text-left ${MOTION} ${
        selected ? 'border-action ring-2 ring-action/30' : 'border-line hover:border-ink-soft'
      }`}
    >
      <div aria-hidden="true" className="space-y-2 p-3" style={{ backgroundColor: colors.background }}>
        <p className="truncate text-base leading-tight" style={face(preset, 'category', colors.text)}>
          Tacos
        </p>
        <div
          className="flex items-center justify-between gap-2 rounded-lg border p-2"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <span className="min-w-0 space-y-0.5">
            <span className="block truncate text-sm" style={face(preset, 'product_name', colors.text)}>
              Al pastor
            </span>
            <span className="block text-sm" style={face(preset, 'price', colors.price)}>
              $45.00
            </span>
          </span>
          <span
            className="shrink-0 rounded-md px-2 py-1 text-xs"
            style={{ ...face(preset, 'button', colors.button_text), backgroundColor: colors.button_bg }}
          >
            Add
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 border-t border-line bg-surface p-3">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          {preset.name}
          {selected && <CheckCircleIcon weight="fill" aria-label="In use" className="h-4 w-4 text-action" />}
        </span>
        <span className="text-xs text-muted">{preset.description}</span>
      </div>
    </button>
  )
}

interface PresetGalleryProps {
  presets: ThemePreset[]
  /** Id of the preset the draft still matches exactly, if any. */
  selected: string | null
  onApply: (preset: ThemePreset) => void
}

/** Ready-made designs: one click sets colors and typography; the brand stays as it is. */
export function PresetGallery({ presets, selected, onApply }: PresetGalleryProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {presets.map((preset) => (
        <PresetCard key={preset.id} preset={preset} selected={preset.id === selected} onApply={() => onApply(preset)} />
      ))}
    </div>
  )
}
