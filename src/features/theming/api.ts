import { apiFetch } from '../../shared/api/http.ts'
import { normalizeLayout, withDrawableLayout } from './layout.ts'

export type ThemeMode = 'light' | 'dark'
export type LogoSize = 'sm' | 'md' | 'lg'
export type LogoPosition = 'left' | 'center'
export type BannerHeight = 'sm' | 'md' | 'lg'
export type BackgroundKind = 'none' | 'image' | 'pattern'
export type BackgroundPattern = 'dots' | 'grid' | 'stripes' | 'waves' | 'checks' | 'zigzag'
export type ImageSlot = 'logo' | 'banner' | 'background'

export const BACKGROUND_PATTERNS: BackgroundPattern[] = ['dots', 'grid', 'stripes', 'waves', 'checks', 'zigzag']
export const MAX_NAME_LENGTH = 60
export const MAX_TAGLINE_LENGTH = 120
export const MAX_WELCOME_LENGTH = 280
export const MAX_BLUR = 20

export interface ThemeColors {
  mode: ThemeMode
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
  text_muted: string
  price: string
  button_bg: string
  button_text: string
  button_hover: string
  border: string
  badge_bg: string
  badge_text: string
  cart_bg: string
  cart_text: string
  gradient: { enabled: boolean; from: string; to: string; angle: number }
}

export type ColorField = Exclude<keyof ThemeColors, 'mode' | 'gradient'>

export interface ThemeBrand {
  /** Empty: the menu shows the business name. */
  name: string
  tagline: string
  welcome_message: string
  logo: { image_id: string | null; size: LogoSize; position: LogoPosition }
  banner: { image_id: string | null; height: BannerHeight; overlay_color: string; overlay_opacity: number }
  background: { kind: BackgroundKind; image_id: string | null; pattern: BackgroundPattern; opacity: number; blur: number }
}

export type FontId =
  | 'geist'
  | 'inter'
  | 'poppins'
  | 'montserrat'
  | 'lato'
  | 'nunito'
  | 'playfair_display'
  | 'lora'
  | 'merriweather'
  | 'oswald'
  | 'bebas_neue'
  | 'pacifico'
  | 'caveat'
export type FontRole = 'heading' | 'body' | 'price' | 'button'
export type TextElement = 'business_name' | 'category' | 'product_name' | 'description' | 'price' | 'button'
export type FontStyle = 'normal' | 'italic'
export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize'
export type TextAlign = 'left' | 'center' | 'right'

export interface TextStyle {
  /** One of the four role fonts. */
  font: FontRole
  /** px, before the global scale. */
  size: number
  weight: number
  style: FontStyle
  /** % of the size. */
  line_height: number
  /** Thousandths of an em. */
  letter_spacing: number
  transform: TextTransform
  align: TextAlign
}

export interface Typography {
  /** % applied to every size. */
  scale: number
  fonts: Record<FontRole, FontId>
  elements: Record<TextElement, TextStyle>
}

export type Navigation = 'chips' | 'tabs' | 'sidebar' | 'sections'
export type ProductView = 'grid' | 'list' | 'carousel'
export type Density = 'compact' | 'comfortable' | 'spacious'
export type CategoryHeader = 'plain' | 'underline' | 'band'
export type CartStyle = 'bar' | 'panel' | 'floating'

export interface ThemeLayout {
  navigation: Navigation
  product_view: ProductView
  /** Grid columns on wide screens (1-4); narrow screens show fewer. */
  columns: number
  density: Density
  sticky_header: boolean
  category_header: CategoryHeader
  show_banner: boolean
  show_tagline: boolean
  show_welcome: boolean
  cart: CartStyle
}

export interface Theme {
  schema_version: 3
  colors: ThemeColors
  brand: ThemeBrand
  typography: Typography
  layout: ThemeLayout
}

/** Delivery URL of each image the theme uses, by public id (missing while the storage is not configured). */
export type ImageUrls = Record<string, string>

export interface PublishedTheme {
  theme: Theme
  image_urls: ImageUrls
}

export interface ContrastWarning {
  foreground: ColorField
  background: ColorField
  ratio: number
}

/** A complete design (colors and typography) the admin starts from; applying one keeps the brand. */
export interface ThemePreset {
  id: string
  name: string
  description: string
  colors: ThemeColors
  typography: Typography
  layout: ThemeLayout
}

export interface ThemeDraftState {
  draft: Theme
  published: Theme | null
  published_at: string | null
  has_unpublished_changes: boolean
  contrast_warnings: ContrastWarning[]
  defaults: { light: ThemeColors; dark: ThemeColors }
  presets: ThemePreset[]
  image_urls: ImageUrls
}

interface UploadSignature {
  upload_url: string
  api_key: string
  timestamp: number
  signature: string
  public_id: string
  allowed_formats: string[]
  overwrite: boolean
  max_bytes: number
}

/** Error with a message ready to show to the admin. */
export class ThemeError extends Error {
  /** HTTP status of the failed request (0 when the server never answered). */
  readonly status: number

  constructor(message: string, status = 0) {
    super(message)
    this.status = status
  }
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const OFFLINE = 'Could not reach the server. Check your connection and try again.'
const SERVER_FAILED = 'The server could not complete that. Please try again in a moment.'

async function errorFrom(response: Response): Promise<ThemeError> {
  const body = (await response.json().catch(() => null)) as { detail?: unknown } | null
  if (typeof body?.detail === 'string') {
    return new ThemeError(body.detail.endsWith('.') ? body.detail : `${body.detail}.`, response.status)
  }
  if (response.status === 401) return new ThemeError('Your session ended. Sign in again to keep editing.', 401)
  return new ThemeError(SERVER_FAILED, response.status)
}

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  let response: Response
  try {
    response = await apiFetch(path, init)
  } catch {
    throw new ThemeError(OFFLINE)
  }
  if (!response.ok) throw await errorFrom(response)
  return response
}

/** What the tables see: the published theme, or the defaults until the admin publishes one. */
export async function fetchPublishedTheme(): Promise<PublishedTheme> {
  const published = (await (await send('/theme')).json()) as PublishedTheme
  return { ...published, theme: withDrawableLayout(published.theme) }
}

/** Every theme in a draft state with a layout the menu and the preview can always draw. */
function drawable(state: ThemeDraftState): ThemeDraftState {
  return {
    ...state,
    draft: withDrawableLayout(state.draft),
    published: state.published && withDrawableLayout(state.published),
    presets: state.presets.map((preset) => ({ ...preset, layout: normalizeLayout(preset.layout) })),
  }
}

export async function fetchThemeDraft(): Promise<ThemeDraftState> {
  return drawable((await (await send('/theme/draft')).json()) as ThemeDraftState)
}

/** Saves the whole draft; the tables keep the published theme until `publishTheme`. */
export async function saveThemeDraft(theme: Theme): Promise<ThemeDraftState> {
  const init = { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(theme) }
  return drawable((await (await send('/theme/draft', init)).json()) as ThemeDraftState)
}

export async function publishTheme(): Promise<ThemeDraftState> {
  return drawable((await (await send('/theme/publish', { method: 'POST' })).json()) as ThemeDraftState)
}

const FORMAT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

/**
 * Uploads straight from the browser to the image storage, for one theme slot, with a one-time signature
 * for a public id the server chose; returns that public id. Saving the draft with it attaches it; if it is
 * never saved, the server's cleanup deletes it.
 */
export async function uploadThemeImage(slot: ImageSlot, file: File): Promise<string> {
  const init = { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ kind: slot }) }
  const signature = (await (await send('/theme/images/signature', init)).json()) as UploadSignature
  const format = FORMAT_BY_TYPE[file.type]
  if (!format || !signature.allowed_formats.includes(format)) {
    throw new ThemeError(`Use a ${signature.allowed_formats.join(', ')} image.`)
  }
  if (file.size > signature.max_bytes) {
    throw new ThemeError(`The image must be at most ${Math.floor(signature.max_bytes / (1024 * 1024))} MB.`)
  }

  const form = new FormData()
  form.append('file', file)
  form.append('api_key', signature.api_key)
  form.append('timestamp', String(signature.timestamp))
  form.append('signature', signature.signature)
  form.append('public_id', signature.public_id)
  form.append('allowed_formats', signature.allowed_formats.join(','))
  form.append('overwrite', String(signature.overwrite))
  let upload: Response
  try {
    // Cross-origin and without cookies: the signature is the only credential.
    upload = await fetch(signature.upload_url, { method: 'POST', body: form, credentials: 'omit' })
  } catch {
    throw new ThemeError('Could not upload the image. Please try again.')
  }
  if (!upload.ok) throw new ThemeError('The image storage rejected the file. Please try another image.')
  return signature.public_id
}
