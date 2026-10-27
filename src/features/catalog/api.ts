import { apiFetch } from '../../shared/api/http.ts'

export interface ItemImage {
  public_id: string
  /** Null while the image storage is not configured on the server. */
  thumbnail_url: string | null
  card_url: string | null
}

export interface CatalogItem {
  id: string
  category_id: string
  name: string
  description: string
  /** Integer cents. */
  price_cents: number
  position: number
  is_available: boolean
  image: ItemImage | null
}

export interface Category {
  id: string
  name: string
  position: number
  is_visible: boolean
}

export interface CategoryWithItems extends Category {
  items: CatalogItem[]
}

export interface ItemDraft {
  category_id: string
  name: string
  description: string
  price_cents: number
}

export type ItemChanges = Partial<ItemDraft & { is_available: boolean }>
export type CategoryChanges = Partial<Pick<Category, 'name' | 'is_visible'>>

interface UploadSignature {
  upload_url: string
  api_key: string
  timestamp: number
  signature: string
  public_id: string
  allowed_formats: string[]
  /** Signed too: the storage refuses to replace an already uploaded file. */
  overwrite: boolean
  max_bytes: number
}

/** Error with a message ready to show to the admin. */
export class CatalogError extends Error {}

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const OFFLINE = 'Could not reach the server. Check your connection and try again.'
const SERVER_FAILED = 'The server could not complete that. Please try again in a moment.'

async function errorFrom(response: Response): Promise<CatalogError> {
  const body = (await response.json().catch(() => null)) as { detail?: unknown } | null
  // Domain errors carry a readable message; schema errors carry a list of field problems.
  if (typeof body?.detail === 'string') {
    return new CatalogError(body.detail.endsWith('.') ? body.detail : `${body.detail}.`)
  }
  if (response.status === 422) return new CatalogError('Please check the fields and try again.')
  if (response.status === 401) return new CatalogError('Your session ended. Sign in again to keep editing.')
  return new CatalogError(SERVER_FAILED)
}

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  let response: Response
  try {
    response = await apiFetch(path, init)
  } catch {
    throw new CatalogError(OFFLINE)
  }
  if (!response.ok) throw await errorFrom(response)
  return response
}

function json(method: string, body: unknown): RequestInit {
  return { method, headers: JSON_HEADERS, body: JSON.stringify(body) }
}

/** The whole catalog in menu order, hidden categories and unavailable items included. */
export async function listCatalog(): Promise<CategoryWithItems[]> {
  return (await (await send('/catalog/categories')).json()) as CategoryWithItems[]
}

export async function createCategory(name: string): Promise<Category> {
  return (await (await send('/catalog/categories', json('POST', { name }))).json()) as Category
}

export async function updateCategory(id: string, changes: CategoryChanges): Promise<Category> {
  return (await (await send(`/catalog/categories/${id}`, json('PATCH', changes))).json()) as Category
}

/** Only empty categories can be deleted. */
export async function deleteCategory(id: string): Promise<void> {
  await send(`/catalog/categories/${id}`, { method: 'DELETE' })
}

/** `ids` must list every category exactly once. */
export async function reorderCategories(ids: string[]): Promise<void> {
  await send('/catalog/categories/order', json('PUT', { ids }))
}

export async function createItem(draft: ItemDraft): Promise<CatalogItem> {
  return (await (await send('/catalog/items', json('POST', draft))).json()) as CatalogItem
}

export async function updateItem(id: string, changes: ItemChanges): Promise<CatalogItem> {
  return (await (await send(`/catalog/items/${id}`, json('PATCH', changes))).json()) as CatalogItem
}

export async function deleteItem(id: string): Promise<void> {
  await send(`/catalog/items/${id}`, { method: 'DELETE' })
}

/** `ids` must list every item of the category exactly once. */
export async function reorderItems(categoryId: string, ids: string[]): Promise<void> {
  await send(`/catalog/categories/${categoryId}/items/order`, json('PUT', { ids }))
}

const FORMAT_BY_TYPE: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

/**
 * Uploads straight from the browser to the image storage with a one-time signature for a public id
 * chosen (and recorded) by the server, and returns that public id. It does not touch the catalog, so
 * the panel runs it outside its change queue: a slow upload never blocks other edits. If the file is
 * never attached, the server's background cleanup deletes it.
 */
export async function uploadImageFile(file: File): Promise<string> {
  const signature = (await (await send('/catalog/images/signature', { method: 'POST' })).json()) as UploadSignature
  const format = FORMAT_BY_TYPE[file.type]
  if (!format || !signature.allowed_formats.includes(format)) {
    throw new CatalogError(`Use a ${signature.allowed_formats.join(', ')} image.`)
  }
  if (file.size > signature.max_bytes) {
    throw new CatalogError(`The image must be at most ${Math.floor(signature.max_bytes / (1024 * 1024))} MB.`)
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
    throw new CatalogError('Could not upload the image. Please try again.')
  }
  if (!upload.ok) throw new CatalogError('The image storage rejected the file. Please try another image.')
  return signature.public_id
}

/** Attaches an uploaded image to the item; the server re-checks format and size and discards the old one. */
export async function attachItemImage(itemId: string, publicId: string): Promise<CatalogItem> {
  return (await (await send(`/catalog/items/${itemId}/image`, json('PUT', { public_id: publicId }))).json()) as CatalogItem
}

export async function removeItemImage(itemId: string): Promise<CatalogItem> {
  return (await (await send(`/catalog/items/${itemId}/image`, { method: 'DELETE' })).json()) as CatalogItem
}
