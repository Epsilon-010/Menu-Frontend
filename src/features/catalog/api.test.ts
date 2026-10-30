import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  attachItemImage,
  CatalogError,
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  listCatalog,
  updateItem,
  uploadImageFile,
} from './api.ts'

function jsonResponse(status: number, body: unknown, contentType = 'application/json'): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': contentType } })
}

function problem(status: number, detail?: string): Response {
  const body = { type: 'about:blank', title: 'Problem', status, ...(detail ? { detail } : {}) }
  return jsonResponse(status, body, 'application/problem+json')
}

/** Answers each fetch with the next response, and records what was requested. */
function stubFetch(...responses: (Response | Error)[]) {
  const calls: { url: string; init?: RequestInit }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      const next = responses.shift()
      if (!next) throw new Error(`Unexpected request to ${url}`)
      if (next instanceof Error) throw next
      return next
    }),
  )
  return calls
}

async function failureOf(promise: Promise<unknown>): Promise<CatalogError> {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  )
  expect(error).toBeInstanceOf(CatalogError)
  return error as CatalogError
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('catalog API errors', () => {
  it('shows the server detail once, with a single final period', async () => {
    stubFetch(problem(409, 'Category name already in use'))
    expect((await failureOf(listCatalog())).message).toBe('Category name already in use.')

    stubFetch(problem(409, 'Already ends with a period.'))
    expect((await failureOf(listCatalog())).message).toBe('Already ends with a period.')
  })

  it('asks to check the fields for schema errors without a detail', async () => {
    stubFetch(jsonResponse(422, { type: 'about:blank', title: 'Unprocessable Content', status: 422, errors: [] }))
    expect((await failureOf(listCatalog())).message).toBe('Please check the fields and try again.')
  })

  it('says the server failed, not that it is unreachable, on a 500', async () => {
    stubFetch(new Response('boom', { status: 500 }))
    expect((await failureOf(listCatalog())).message).toBe(
      'The server could not complete that. Please try again in a moment.',
    )
  })

  it('says the session ended when the refresh also fails', async () => {
    // The original 401, then the single refresh attempt the HTTP client makes.
    const calls = stubFetch(problem(401, ''), problem(401, ''))
    expect((await failureOf(listCatalog())).message).toBe('Your session ended. Sign in again to keep editing.')
    expect(calls.map((call) => call.url)).toEqual(['/api/v1/catalog/categories', '/api/v1/auth/refresh'])
  })

  it('says the server is unreachable only when the request never got an answer', async () => {
    stubFetch(new TypeError('Failed to fetch'))
    expect((await failureOf(listCatalog())).message).toBe(
      'Could not reach the server. Check your connection and try again.',
    )
  })
})

describe('image upload', () => {
  const signature = {
    upload_url: 'https://upload.test/image/upload',
    api_key: 'key-123',
    timestamp: 1_700_000_000,
    signature: 'sig',
    public_id: 'tenants/t1/items/abc',
    allowed_formats: ['jpg', 'png', 'webp'],
    overwrite: false,
    max_bytes: 5 * 1024 * 1024,
  }
  const item = { id: 'i1', image: { public_id: signature.public_id } }

  it('uploads exactly the signed fields without cookies and returns the public id to attach', async () => {
    const calls = stubFetch(jsonResponse(200, signature), jsonResponse(200, { public_id: 'x' }), jsonResponse(200, item))
    const file = new File(['img'], 'taco.png', { type: 'image/png' })

    // Uploading and attaching are separate steps: only the attach goes through the panel's change queue.
    const publicId = await uploadImageFile(file)
    expect(publicId).toBe(signature.public_id)
    expect(calls).toHaveLength(2)
    await attachItemImage('i1', publicId)

    const upload = calls[1]
    expect(upload.url).toBe(signature.upload_url)
    expect(upload.init?.credentials).toBe('omit')
    const form = upload.init?.body as FormData
    expect([...form.keys()].sort()).toEqual(
      ['allowed_formats', 'api_key', 'file', 'overwrite', 'public_id', 'signature', 'timestamp'].sort(),
    )
    expect(form.get('allowed_formats')).toBe('jpg,png,webp')
    expect(form.get('overwrite')).toBe('false')
    expect(form.get('public_id')).toBe(signature.public_id)
    expect(calls[2].url).toBe('/api/v1/catalog/items/i1/image')
    expect(JSON.parse(String(calls[2].init?.body))).toEqual({ public_id: signature.public_id })
  })

  it('rejects a wrong type or a too large file before uploading anything', async () => {
    const calls = stubFetch(jsonResponse(200, signature), jsonResponse(200, signature))

    const gif = new File(['img'], 'taco.gif', { type: 'image/gif' })
    expect((await failureOf(uploadImageFile(gif))).message).toBe('Use a jpg, png, webp image.')
    const big = new File([new Uint8Array(signature.max_bytes + 1)], 'big.jpg', { type: 'image/jpeg' })
    expect((await failureOf(uploadImageFile(big))).message).toBe('The image must be at most 5 MB.')

    expect(calls.map((call) => call.url)).toEqual(['/api/v1/catalog/images/signature', '/api/v1/catalog/images/signature'])
  })
})

describe('idempotent writes', () => {
  it('sends the client id with every create, so a repeat returns the same resource', async () => {
    const calls = stubFetch(jsonResponse(201, { id: 'c1' }), jsonResponse(201, { id: 'i1' }))

    await createCategory('Tacos', 'c1')
    await createItem({ id: 'i1', category_id: 'c1', name: 'Pastor', description: '', price_cents: 2500 })

    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ id: 'c1', name: 'Tacos' })
    expect(JSON.parse(String(calls[1].init?.body))).toMatchObject({ id: 'i1', category_id: 'c1' })
  })

  it('sends the badges of an item and keeps only known ones when reading the catalog', async () => {
    const item = { id: 'i1', category_id: 'c1', name: 'Pastor', description: '', price_cents: 2500, badges: ['spicy', 'organic', 'new'] }
    const calls = stubFetch(jsonResponse(201, item), jsonResponse(200, [{ id: 'c1', name: 'Tacos', position: 0, is_visible: true, items: [item] }]))
    await createItem({ id: 'i1', category_id: 'c1', name: 'Pastor', description: '', price_cents: 2500, badges: ['new', 'spicy'] })
    expect(JSON.parse(String(calls[0].init?.body)).badges).toEqual(['new', 'spicy'])
    expect((await listCatalog())[0].items[0].badges).toEqual(['new', 'spicy'])
  })

  it('sends the modifier groups of an item and reads a missing list as none', async () => {
    const withGroups = { id: 'i1', category_id: 'c1', name: 'Pastor', description: '', price_cents: 2500, badges: [], modifier_group_ids: ['g2', 'g1'] }
    const legacy = { id: 'i2', category_id: 'c1', name: 'Agua', description: '', price_cents: 1500, badges: [] }
    const calls = stubFetch(
      jsonResponse(201, withGroups),
      jsonResponse(200, withGroups),
      jsonResponse(200, [{ id: 'c1', name: 'Tacos', position: 0, is_visible: true, items: [withGroups, legacy] }]),
    )
    await createItem({ id: 'i1', category_id: 'c1', name: 'Pastor', description: '', price_cents: 2500, modifier_group_ids: ['g2', 'g1'] })
    expect(JSON.parse(String(calls[0].init?.body)).modifier_group_ids).toEqual(['g2', 'g1'])
    await updateItem('i1', { modifier_group_ids: [] })
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({ modifier_group_ids: [] })

    const [items] = (await listCatalog()).map((category) => category.items)
    expect(items.map((item) => item.modifier_group_ids)).toEqual([['g2', 'g1'], []])
  })

  it('treats deleting something already gone as done', async () => {
    stubFetch(problem(404, 'Item not found'), problem(404, 'Category not found'))

    await expect(deleteItem('i1')).resolves.toBeUndefined()
    await expect(deleteCategory('c1')).resolves.toBeUndefined()
  })
})
