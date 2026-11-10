import { ImageIcon, TrashIcon, UploadSimpleIcon } from '@phosphor-icons/react'
import { useRef, useState, type ChangeEvent } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { Field, TextArea, TextInput } from '../../shared/ui/Field.tsx'
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
import { Choice, SliderField } from './Choice.tsx'
import { ColorInput } from './ColorControls.tsx'
import { withBrand } from './editor.ts'

const SIZE_LABELS: Record<LogoSize | BannerHeight, string> = { sm: 'Pequeño', md: 'Mediano', lg: 'Grande' }
const SIZES: (LogoSize | BannerHeight)[] = ['sm', 'md', 'lg']
const LOGO_POSITION_LABELS: Record<LogoPosition, string> = { center: 'Centrado', left: 'A la izquierda' }
const LOGO_POSITIONS: LogoPosition[] = ['center', 'left']
const BACKGROUND_KINDS: BackgroundKind[] = ['none', 'pattern', 'image']
const PATTERN_LABELS: Record<BackgroundPattern, string> = {
  dots: 'Puntos',
  grid: 'Cuadrícula',
  stripes: 'Rayas',
  waves: 'Ondas',
  checks: 'Cuadros',
  zigzag: 'Zigzag',
}
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
            <ImageIcon size={20} className="text-faint" aria-label={hasImage ? 'Imagen guardada' : 'Sin imagen'} />
          )}
        </div>
        <input ref={input} type="file" accept={ACCEPT[slot]} className="sr-only" onChange={(event) => void handleFile(event)} />
        <Button icon={<UploadSimpleIcon size={16} aria-hidden />} disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Subiendo…' : hasImage ? 'Reemplazar' : 'Subir'}
        </Button>
        {hasImage && (
          <Button variant="ghost" icon={<TrashIcon size={16} aria-hidden />} disabled={busy} onClick={onRemove}>
            Quitar
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
  return <SliderField label={label} value={value} min={0} max={max} display={`${value}${unit}`} onChange={onChange} />
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
        <Field label="Nombre en el menú" hint={`Déjalo vacío para mostrar ${businessName}.`}>
          <TextInput
            maxLength={MAX_NAME_LENGTH}
            placeholder={businessName}
            value={brand.name}
            onChange={(event) => onChange(withBrand(theme, { name: event.target.value }))}
          />
        </Field>
        <Field label="Eslogan">
          <TextInput
            maxLength={MAX_TAGLINE_LENGTH}
            placeholder="Tacos al pastor desde 1990"
            value={brand.tagline}
            onChange={(event) => onChange(withBrand(theme, { tagline: event.target.value }))}
          />
        </Field>
        <Field label="Mensaje de bienvenida">
          <TextArea
            rows={3}
            maxLength={MAX_WELCOME_LENGTH}
            placeholder="Pide desde tu mesa y te lo llevamos."
            value={brand.welcome_message}
            onChange={(event) => onChange(withBrand(theme, { welcome_message: event.target.value }))}
          />
        </Field>
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-ink">Logo</legend>
        <ImageSlotControl
          slot="logo"
          label="Imagen (PNG, JPG, WebP o SVG)"
          imageUrl={urlOf(brand.logo.image_id)}
          hasImage={brand.logo.image_id !== null}
          onUpload={onUpload}
          onRemove={() => onChange(withBrand(theme, { logo: { ...brand.logo, image_id: null } }))}
        />
        <div className="grid gap-4 @sm:grid-cols-2">
          <Choice
            label="Tamaño"
            value={brand.logo.size}
            options={SIZES}
            labels={SIZE_LABELS}
            onChange={(size) => onChange(withBrand(theme, { logo: { ...brand.logo, size } }))}
          />
          <Choice
            label="Posición"
            value={brand.logo.position}
            options={LOGO_POSITIONS}
            labels={LOGO_POSITION_LABELS}
            onChange={(position) => onChange(withBrand(theme, { logo: { ...brand.logo, position } }))}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-ink">Banner</legend>
        <ImageSlotControl
          slot="banner"
          label="Imagen (PNG, JPG o WebP)"
          imageUrl={urlOf(brand.banner.image_id)}
          hasImage={brand.banner.image_id !== null}
          onUpload={onUpload}
          onRemove={() => onChange(withBrand(theme, { banner: { ...brand.banner, image_id: null } }))}
        />
        <div className="grid gap-4 @sm:grid-cols-2">
          <Choice
            label="Altura"
            value={brand.banner.height}
            options={SIZES}
            labels={SIZE_LABELS}
            onChange={(height) => onChange(withBrand(theme, { banner: { ...brand.banner, height } }))}
          />
          <ColorInput
            label="Color del velo"
            value={brand.banner.overlay_color}
            onChange={(overlay_color) => onChange(withBrand(theme, { banner: { ...brand.banner, overlay_color } }))}
          />
          <RangeField
            label="Opacidad del velo"
            value={brand.banner.overlay_opacity}
            max={100}
            unit="%"
            onChange={(overlay_opacity) => onChange(withBrand(theme, { banner: { ...brand.banner, overlay_opacity } }))}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-ink">Fondo de la página</legend>
        <Choice
          label="Mostrar"
          kind="select"
          value={brand.background.kind}
          options={BACKGROUND_KINDS}
          labels={{
            none: 'Solo el color de fondo',
            pattern: 'Un patrón',
            image: `Una imagen${brand.background.image_id === null ? ' (sube una primero)' : ''}`,
          }}
          disabledOptions={brand.background.image_id === null ? ['image'] : []}
          onChange={(kind) => onChange(withBrand(theme, { background: { ...brand.background, kind } }))}
        />
        <ImageSlotControl
          slot="background"
          label="Imagen de fondo (PNG, JPG o WebP)"
          imageUrl={urlOf(brand.background.image_id)}
          hasImage={brand.background.image_id !== null}
          onUpload={onUpload}
          onRemove={() => onChange(withBrand(theme, { background: { ...brand.background, image_id: null, kind: 'none' } }))}
        />
        <div className="grid gap-4 @sm:grid-cols-2">
          <Choice
            label="Patrón"
            value={brand.background.pattern}
            options={BACKGROUND_PATTERNS}
            labels={PATTERN_LABELS}
            onChange={(pattern) => onChange(withBrand(theme, { background: { ...brand.background, pattern } }))}
          />
          <RangeField
            label="Opacidad"
            value={brand.background.opacity}
            max={100}
            unit="%"
            onChange={(opacity) => onChange(withBrand(theme, { background: { ...brand.background, opacity } }))}
          />
          <RangeField
            label="Desenfoque (imagen)"
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
