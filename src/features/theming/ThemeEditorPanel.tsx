import { useEffect, useState } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { ErrorText, ListSkeleton, LoadError, SuccessText } from '../../shared/ui/Feedback.tsx'
import { Card, SectionHeader } from '../../shared/ui/Section.tsx'
import { useAuth } from '../auth/useAuth.ts'
import {
  fetchThemeDraft,
  publishTheme,
  saveThemeDraft,
  ThemeError,
  uploadThemeImage,
  type ImageSlot,
  type ImageUrls,
  type Theme,
  type ThemeDraftState,
  type ThemePreset,
} from './api.ts'
import { BrandControls } from './BrandControls.tsx'
import { ColorControls } from './ColorControls.tsx'
import { keepNewerEdits, matchingPreset, withBrand, withPreset } from './editor.ts'
import { PresetGallery } from './PresetGallery.tsx'
import { ThemePreview } from './ThemePreview.tsx'
import { TypographyControls } from './TypographyControls.tsx'

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'loaded'; saved: ThemeDraftState }

function messageOf(error: unknown): string {
  return error instanceof ThemeError ? error.message : 'Something went wrong. Please try again.'
}

function sameTheme(first: Theme, second: Theme): boolean {
  return JSON.stringify(first) === JSON.stringify(second)
}

function withImage(theme: Theme, slot: ImageSlot, publicId: string): Theme {
  const { brand } = theme
  if (slot === 'logo') return withBrand(theme, { logo: { ...brand.logo, image_id: publicId } })
  if (slot === 'banner') return withBrand(theme, { banner: { ...brand.banner, image_id: publicId } })
  // A new background image is meant to be shown.
  return withBrand(theme, { background: { ...brand.background, image_id: publicId, kind: 'image' } })
}

function statusText(saved: ThemeDraftState, dirty: boolean): string {
  if (dirty) return 'Unsaved changes.'
  if (saved.has_unpublished_changes) return 'Draft saved. Publish it to show it on the tables.'
  if (saved.published_at) return `Published on ${new Date(saved.published_at).toLocaleString()}. The tables show this design.`
  return 'The tables show the default design.'
}

/**
 * Admin section for how the table menu looks. Edits live in a draft with a live preview; the tables
 * only change when the admin publishes.
 */
export function ThemeEditorPanel() {
  const { state } = useAuth()
  const businessName = state.status === 'authenticated' ? state.account.tenant.name : ''
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [loadKey, setLoadKey] = useState(0)
  const [draft, setDraft] = useState<Theme | null>(null)
  // Images uploaded in this visit, shown from the file until the server returns their delivery URLs.
  const [localUrls, setLocalUrls] = useState<ImageUrls>({})
  const [busy, setBusy] = useState<'saving' | 'publishing' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchThemeDraft()
      .then((saved) => {
        if (!active) return
        setDraft(saved.draft)
        setLoad({ status: 'loaded', saved })
      })
      .catch((caught: unknown) => {
        if (active) setLoad({ status: 'error', message: messageOf(caught) })
      })
    return () => {
      active = false
    }
  }, [loadKey])

  if (load.status === 'loading' || (load.status === 'loaded' && draft === null)) {
    return <ListSkeleton rows={3} label="Loading the menu design" />
  }
  if (load.status === 'error') {
    return (
      <LoadError
        message={load.message}
        onRetry={() => {
          setLoad({ status: 'loading' })
          setLoadKey((key) => key + 1)
        }}
      />
    )
  }
  const { saved } = load
  const theme = draft as Theme
  const dirty = !sameTheme(theme, saved.draft)
  const imageUrls = { ...saved.image_urls, ...localUrls }

  function edit(next: Theme) {
    setDraft(next)
    setNotice(null)
  }

  function applyPreset(preset: ThemePreset) {
    setDraft(withPreset(theme, preset))
    setNotice(`${preset.name} applied to the draft. Adjust anything below, then save or publish.`)
  }

  async function upload(slot: ImageSlot, file: File): Promise<string | null> {
    try {
      const publicId = await uploadThemeImage(slot, file)
      setLocalUrls((urls) => ({ ...urls, [publicId]: URL.createObjectURL(file) }))
      setDraft((current) => (current ? withImage(current, slot, publicId) : current))
      setNotice(null)
      return null
    } catch (caught) {
      return messageOf(caught)
    }
  }

  // `theme` is the draft when the button was pressed; the controls stay usable while the request runs.
  async function save(): Promise<boolean> {
    try {
      const result = await saveThemeDraft(theme)
      setDraft((current) => (current ? keepNewerEdits(current, theme, result.draft) : result.draft))
      setLoad({ status: 'loaded', saved: result })
      setError(null)
      return true
    } catch (caught) {
      setError(messageOf(caught))
      return false
    }
  }

  async function handleSave() {
    setBusy('saving')
    if (await save()) setNotice('Draft saved. The tables still show the published design.')
    setBusy(null)
  }

  async function handlePublish() {
    setBusy('publishing')
    if (!dirty || (await save())) {
      try {
        const result = await publishTheme()
        setDraft((current) => (current ? keepNewerEdits(current, theme, result.draft) : result.draft))
        setLoad({ status: 'loaded', saved: result })
        setError(null)
        setNotice('Published. The tables show the new design within a minute.')
      } catch (caught) {
        setError(messageOf(caught))
      }
    }
    setBusy(null)
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Design"
        description="Start from a template or choose the colors, logo and banner of your table menu. Changes stay in a draft with a live preview until you publish them."
        action={
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy !== null || !dirty} onClick={() => void handleSave()}>
              {busy === 'saving' ? 'Saving…' : 'Save draft'}
            </Button>
            <Button
              variant="primary"
              disabled={busy !== null || (!dirty && !saved.has_unpublished_changes && saved.published_at !== null)}
              onClick={() => void handlePublish()}
            >
              {busy === 'publishing' ? 'Publishing…' : 'Publish'}
            </Button>
          </div>
        }
      />

      <div className="space-y-2">
        <p role="status" className="text-sm text-muted">
          {statusText(saved, dirty)}
        </p>
        {error && <ErrorText>{error}</ErrorText>}
        {notice && <SuccessText>{notice}</SuccessText>}
      </div>

      <Card className="space-y-4 p-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-ink">Templates</h2>
          <p className="text-sm text-muted">
            Want something quick? Pick a template: it sets the colors and fonts, and keeps your name, logo and images.
          </p>
        </div>
        <PresetGallery presets={saved.presets} selected={matchingPreset(theme, saved.presets)} onApply={applyPreset} />
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="min-w-0 space-y-8">
          <Card className="space-y-4 p-4">
            <h2 className="text-lg font-semibold tracking-tight text-ink">Colors</h2>
            <ColorControls theme={theme} defaults={saved.defaults} onChange={edit} />
          </Card>
          <Card className="space-y-4 p-4">
            <h2 className="text-lg font-semibold tracking-tight text-ink">Brand</h2>
            <BrandControls
              theme={theme}
              imageUrls={imageUrls}
              businessName={businessName}
              onChange={edit}
              onUpload={upload}
            />
          </Card>
          <Card className="space-y-4 p-4">
            <h2 className="text-lg font-semibold tracking-tight text-ink">Typography</h2>
            <TypographyControls theme={theme} onChange={edit} />
          </Card>
        </div>

        <aside aria-label="Preview" className="min-w-0">
          <div className="sticky top-24 space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-ink">Preview</h2>
            <ThemePreview theme={theme} imageUrls={imageUrls} businessName={businessName} />
          </div>
        </aside>
      </div>
    </div>
  )
}
