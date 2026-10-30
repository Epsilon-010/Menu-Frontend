import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchPublishedTheme,
  fetchThemeVersions,
  importTheme,
  publishTheme,
  saveThemeDraft,
  ThemeError,
  uploadThemeImage,
  type Theme,
} from './api.ts'
import { DEFAULT_CARDS } from './cards.ts'
import { DEFAULT_LAYOUT } from './layout.ts'

function jsonResponse(status: number, body: unknown, contentType = 'application/json'): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': contentType } })
}

function problem(status: number, detail: string): Response {
  return jsonResponse(status, { type: 'about:blank', title: 'Problem', status, detail }, 'application/problem+json')
}

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

async function failureOf(promise: Promise<unknown>): Promise<ThemeError> {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  )
  expect(error).toBeInstanceOf(ThemeError)
  return error as ThemeError
}

const THEME = { schema_version: 4, layout: DEFAULT_LAYOUT, cards: DEFAULT_CARDS } as Theme
const DRAFT_STATE = { draft: THEME, published: null, presets: [] }
const SIGNATURE = {
  upload_url: 'https://upload.test/image/upload',
  api_key: 'key',
  timestamp: 1,
  signature: 'signed',
  public_id: 'tenants/t/logos/abc',
  allowed_formats: ['jpg', 'png', 'webp', 'svg'],
  overwrite: false,
  max_bytes: 5 * 1024 * 1024,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('theme api', () => {
  it('reads the published theme the tables see', async () => {
    const calls = stubFetch(jsonResponse(200, { theme: THEME, image_urls: {} }))
    expect(await fetchPublishedTheme()).toEqual({ theme: THEME, image_urls: {} })
    expect(calls[0].url).toBe('/api/v1/theme')
  })

  it('gives a theme from a server without layouts the default one, so the menu still draws', async () => {
    stubFetch(jsonResponse(200, { theme: { schema_version: 2 }, image_urls: {} }))
    expect((await fetchPublishedTheme()).theme.layout).toEqual(DEFAULT_LAYOUT)
  })

  it('gives a theme from a server without cards the default card, so the menu still draws', async () => {
    stubFetch(jsonResponse(200, { theme: { schema_version: 3, layout: DEFAULT_LAYOUT }, image_urls: {} }))
    expect((await fetchPublishedTheme()).theme.cards).toEqual(DEFAULT_CARDS)
  })

  it('saves the whole draft with PUT and publishes with POST', async () => {
    const calls = stubFetch(jsonResponse(200, DRAFT_STATE), jsonResponse(200, DRAFT_STATE))
    await saveThemeDraft(THEME)
    await publishTheme()
    expect(calls.map((call) => [call.url, call.init?.method])).toEqual([
      ['/api/v1/theme/draft', 'PUT'],
      ['/api/v1/theme/publish', 'POST'],
    ])
    expect(JSON.parse(String(calls[0].init?.body))).toEqual(THEME)
  })

  it('shows the server message naming the invalid field', async () => {
    stubFetch(problem(422, 'Invalid theme value: colors.primary'))
    const error = await failureOf(saveThemeDraft(THEME))
    expect(error.message).toBe('Invalid theme value: colors.primary.')
    expect(error.status).toBe(422)
  })

  it('uploads a logo straight to the storage with the signature for that slot', async () => {
    const calls = stubFetch(jsonResponse(200, SIGNATURE), jsonResponse(200, {}))
    const file = new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' })
    expect(await uploadThemeImage('logo', file)).toBe('tenants/t/logos/abc')
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ kind: 'logo' })
    expect(calls[1].url).toBe('https://upload.test/image/upload')
    expect(calls[1].init?.credentials).toBe('omit')
  })

  it('refuses a format the slot does not take before uploading', async () => {
    const calls = stubFetch(jsonResponse(200, { ...SIGNATURE, allowed_formats: ['jpg', 'png', 'webp'] }))
    const file = new File(['<svg/>'], 'banner.svg', { type: 'image/svg+xml' })
    const error = await failureOf(uploadThemeImage('banner', file))
    expect(error.message).toBe('Use a jpg, png, webp image.')
    expect(calls).toHaveLength(1)
  })

  it('reads the published versions newest first, each one drawable', async () => {
    const old = { ...THEME, layout: undefined, cards: undefined } as unknown as Theme
    const versions = [
      { id: 'v2', number: 2, published_at: '2026-10-30T12:00:00Z', theme: THEME },
      { id: 'v1', number: 1, published_at: '2026-10-29T12:00:00Z', theme: old },
    ]
    const calls = stubFetch(jsonResponse(200, { versions, image_urls: { a: 'https://images.test/a' } }))
    const history = await fetchThemeVersions()
    expect(calls[0].url).toBe('/api/v1/theme/versions')
    expect(history.versions.map((version) => version.number)).toEqual([2, 1])
    expect(history.versions[1].theme.layout).toEqual(DEFAULT_LAYOUT)
    expect(history.versions[1].theme.cards).toEqual(DEFAULT_CARDS)
    expect(history.image_urls).toEqual({ a: 'https://images.test/a' })
  })

  it('sends an exported document to be checked and gets back the theme and the removed images', async () => {
    const calls = stubFetch(jsonResponse(200, { theme: THEME, removed_images: ['logo'], image_urls: {} }))
    const exported = { schema_version: 2, colors: {} }
    const imported = await importTheme(exported)
    expect(calls[0].url).toBe('/api/v1/theme/import')
    expect(calls[0].init?.method).toBe('POST')
    expect(JSON.parse(String(calls[0].init?.body))).toEqual(exported)
    expect(imported).toEqual({ theme: THEME, removed_images: ['logo'], image_urls: {} })
  })

  it('shows why an import was rejected', async () => {
    stubFetch(problem(422, 'Invalid theme value: schema_version'))
    const error = await failureOf(importTheme({ schema_version: 9 }))
    expect(error.message).toBe('Invalid theme value: schema_version.')
    expect(error.status).toBe(422)
  })
})
