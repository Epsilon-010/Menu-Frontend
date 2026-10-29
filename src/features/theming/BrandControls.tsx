import { ImageIcon, TrashIcon, UploadSimpleIcon } from '@phosphor-icons/react'
import { useRef, useState, type ChangeEvent } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { Field, Select, TextArea, TextInput } from '../../shared/ui/Field.tsx'
import { ErrorText } from '../../shared/ui/Feedback.tsx'
import {
  BACKGROUND_PATTERNS,
  MAX_BLUR,
  MAX_NAME_LENGTH,
  MAX_TAGLINE_LENGTH,
  MAX_WELCOME_LENGTH,
  type BackgroundKind,
  type BackgroundPattern,
  type BannerHeight,
  type ImageSlot,
  type ImageUrls,
  type LogoPosition,
  type LogoSize,
  type Theme,
} from './api.ts'
import { ColorInput } from './ColorControls.tsx'
import { withBrand } from './editor.ts'

const SIZE_LABELS: Record<LogoSize | BannerHeight, string> = { sm: 'Small', md: 'Medium', lg: 'Large' }
const ACCEPT: Record<ImageSlot, string> = {
  logo: 'image/png,image/jpeg,image/webp,image/svg+xml',
  banner: 'image/png,image/jpeg,image/webp',
  background: 'image/png,image/jpeg,image/webp',
}

interface ImageSlotControlProps {
  slot: ImageSlot
  label: string
  imageUrl: string | undefined
  hasImage: boolean
  onUpload: (slot: ImageSlot, file: File) => Promise<string | null>
  onRemove: () => void
}

function ImageSlotControl({ slot, label, imageUrl, hasImage, onUpload, onRemove }: ImageSlotControlProps) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setError(await onUpload(slot, file))
    setBusy(false)
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-ink-soft">{label}</span>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-lg border border-line bg-subtle">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-contain" />
          ) : (
            <ImageIcon size={20} className="text-faint" aria-label={hasImage ? 'Image saved' : 'No image'} />
          )}
        </div>
        <input ref={input} type="file" accept={ACCEPT[slot]} className="sr-only" onChange={(event) => void handleFile(event)} />
        <Button icon={<UploadSimpleIcon size={16} aria-hidden />} disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Uploading…' : hasImage ? 'Replace' : 'Upload'}
        </Button>
        {hasImage && (
          <Button variant="ghost" icon={<TrashIcon size={16} aria-hidden />} disabled={busy} onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  )
}

function RangeField({
  label,
  value,
  max,
  unit,
  onChange,
}: {
  label: string
  value: number
  max: number
  unit: string
  onChange: (value: number) => void
}) {
  return (
    <Field label={`${label}: ${value}${unit}`}>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-zinc-950"
      />
    </Field>
  )
}

interface BrandControlsProps {
  theme: Theme
  imageUrls: ImageUrls
  businessName: string
  onChange: (theme: Theme) => void
  onUpload: (slot: ImageSlot, file: File) => Promise<string | null>
}

export function BrandControls({ theme, imageUrls, businessName, onChange, onUpload }: BrandControlsProps) {
  const { brand } = theme
  const urlOf = (id: string | null) => (id ? imageUrls[id] : undefined)

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Field label="Name on the menu" hint={`Leave it empty to show ${businessName}.`}>
          <TextInput
            maxLength={MAX_NAME_LENGTH}
            placeholder={businessName}
            value={brand.name}
            onChange={(event) => onChange(withBrand(theme, { name: event.target.value }))}
          />
        </Field>
        <Field label="Tagline">
          <TextInput
            maxLength={MAX_TAGLINE_LENGTH}
            placeholder="Tacos al pastor since 1990"
            value={brand.tagline}
            onChange={(event) => onChange(withBrand(theme, { tagline: event.target.value }))}
          />
        </Field>
        <Field label="Welcome message">
          <TextArea
            rows={3}
            maxLength={MAX_WELCOME_LENGTH}
            placeholder="Order from your table and we bring it to you."
            value={brand.welcome_message}
            onChange={(event) => onChange(withBrand(theme, { welcome_message: event.target.value }))}
          />
        </Field>
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-ink">Logo</legend>
        <ImageSlotControl
          slot="logo"
          label="Image (PNG, JPG, WebP or SVG)"
          imageUrl={urlOf(brand.logo.image_id)}
          hasImage={brand.logo.image_id !== null}
          onUpload={onUpload}
          onRemove={() => onChange(withBrand(theme, { logo: { ...brand.logo, image_id: null } }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Size">
            <Select
              value={brand.logo.size}
              onChange={(event) => onChange(withBrand(theme, { logo: { ...brand.logo, size: event.target.value as LogoSize } }))}
            >
              {(['sm', 'md', 'lg'] as LogoSize[]).map((size) => (
                <option key={size} value={size}>
                  {SIZE_LABELS[size]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Position">
            <Select
              value={brand.logo.position}
              onChange={(event) =>
                onChange(withBrand(theme, { logo: { ...brand.logo, position: event.target.value as LogoPosition } }))
              }
            >
              <option value="center">Centered</option>
              <option value="left">Left</option>
            </Select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-ink">Banner</legend>
        <ImageSlotControl
          slot="banner"
          label="Image (PNG, JPG or WebP)"
          imageUrl={urlOf(brand.banner.image_id)}
          hasImage={brand.banner.image_id !== null}
          onUpload={onUpload}
          onRemove={() => onChange(withBrand(theme, { banner: { ...brand.banner, image_id: null } }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Height">
            <Select
              value={brand.banner.height}
              onChange={(event) =>
                onChange(withBrand(theme, { banner: { ...brand.banner, height: event.target.value as BannerHeight } }))
              }
            >
              {(['sm', 'md', 'lg'] as BannerHeight[]).map((height) => (
                <option key={height} value={height}>
                  {SIZE_LABELS[height]}
                </option>
              ))}
            </Select>
          </Field>
          <ColorInput
            label="Overlay color"
            value={brand.banner.overlay_color}
            onChange={(overlay_color) => onChange(withBrand(theme, { banner: { ...brand.banner, overlay_color } }))}
          />
          <RangeField
            label="Overlay opacity"
            value={brand.banner.overlay_opacity}
            max={100}
            unit="%"
            onChange={(overlay_opacity) => onChange(withBrand(theme, { banner: { ...brand.banner, overlay_opacity } }))}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-ink">Page background</legend>
        <Field label="Show">
          <Select
            value={brand.background.kind}
            onChange={(event) =>
              onChange(withBrand(theme, { background: { ...brand.background, kind: event.target.value as BackgroundKind } }))
            }
          >
            <option value="none">Only the background color</option>
            <option value="pattern">A pattern</option>
            <option value="image" disabled={brand.background.image_id === null}>
              An image{brand.background.image_id === null ? ' (upload one first)' : ''}
            </option>
          </Select>
        </Field>
        <ImageSlotControl
          slot="background"
          label="Background image (PNG, JPG or WebP)"
          imageUrl={urlOf(brand.background.image_id)}
          hasImage={brand.background.image_id !== null}
          onUpload={onUpload}
          onRemove={() => onChange(withBrand(theme, { background: { ...brand.background, image_id: null, kind: 'none' } }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pattern">
            <Select
              value={brand.background.pattern}
              onChange={(event) =>
                onChange(
                  withBrand(theme, { background: { ...brand.background, pattern: event.target.value as BackgroundPattern } }),
                )
              }
            >
              {BACKGROUND_PATTERNS.map((pattern) => (
                <option key={pattern} value={pattern}>
                  {pattern[0].toUpperCase() + pattern.slice(1)}
                </option>
              ))}
            </Select>
          </Field>
          <RangeField
            label="Opacity"
            value={brand.background.opacity}
            max={100}
            unit="%"
            onChange={(opacity) => onChange(withBrand(theme, { background: { ...brand.background, opacity } }))}
          />
          <RangeField
            label="Blur (image)"
            value={brand.background.blur}
            max={MAX_BLUR}
            unit="px"
            onChange={(blur) => onChange(withBrand(theme, { background: { ...brand.background, blur } }))}
          />
        </div>
      </fieldset>
    </div>
  )
}
