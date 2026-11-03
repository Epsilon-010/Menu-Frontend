import {
  CardsIcon,
  ClockCounterClockwiseIcon,
  LayoutIcon,
  PaletteIcon,
  SquaresFourIcon,
  StorefrontIcon,
  TextAaIcon,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { MOTION } from '../../shared/ui/classes.ts'
import { ErrorText, ListSkeleton, LoadError, SuccessText } from '../../shared/ui/Feedback.tsx'
import { Card, SectionHeader } from '../../shared/ui/Section.tsx'
import { useAuth } from '../auth/useAuth.ts'
import {
  fetchThemeDraft,
  fetchThemeVersions,
  importTheme,
  publishTheme,
  saveThemeDraft,
  ThemeError,
  uploadThemeImage,
  type ImageSlot,
  type ImageUrls,
  type Theme,
  type ThemeDraftState,
  type ThemePreset,
  type ThemeVersion,
} from './api.ts'
import { BrandControls } from './BrandControls.tsx'
import { ColorControls } from './ColorControls.tsx'
import {
  keepNewerEdits,
  matchingPreset,
  readThemeFile,
  removedImagesText,
  themeFileName,
  withBrand,
  withDefaults,
  withPreset,
} from './editor.ts'
import { PresetGallery } from './PresetGallery.tsx'
import { ThemePreview } from './ThemePreview.tsx'
import { CardControls } from './CardControls.tsx'
import { LayoutControls } from './LayoutControls.tsx'
import { ThemeHistory } from './ThemeHistory.tsx'
import { TypographyControls } from './TypographyControls.tsx'

type EditorSection = 'templates' | 'colors' | 'brand' | 'typography' | 'layout' | 'cards' | 'versions'

const SECTIONS: { id: EditorSection; label: string; description: string; icon: ReactNode }[] = [
  {
    id: 'templates',
    label: 'Templates',
    description: 'Sets the colors, fonts, layout and cards at once; your name, logo and images stay.',
    icon: <SquaresFourIcon size={16} aria-hidden />,
  },
  { id: 'colors', label: 'Colors', description: 'The palette of the menu, in light or dark mode.', icon: <PaletteIcon size={16} aria-hidden /> },
  {
    id: 'brand',
    label: 'Brand',
    description: 'Name, texts, logo, banner and background.',
    icon: <StorefrontIcon size={16} aria-hidden />,
  },
  {
    id: 'typography',
    label: 'Typography',
    description: 'Fonts and how each text of the menu looks.',
    icon: <TextAaIcon size={16} aria-hidden />,
  },
  {
    id: 'layout',
    label: 'Layout',
    description: 'Category navigation, product view, columns and the order bar.',
    icon: <LayoutIcon size={16} aria-hidden />,
  },
  {
    id: 'cards',
    label: 'Product cards',
    description: 'Shape, image, badges and the add button of each product.',
    icon: <CardsIcon size={16} aria-hidden />,
  },
  {
    id: 'versions',
    label: 'Versions',
    description: 'Go back to a published design, start over from the defaults, or move a design between businesses.',
    icon: <ClockCounterClockwiseIcon size={16} aria-hidden />,
  },
]

type LoadState ={ status: 'loading' } | { status: 'error'; message: string } | { status: 'loaded'; saved: ThemeDraftState }

type HistoryState = { versions: ThemeVersion[] | null; error: string | null }

function messageOf(error: unknown): string {
  return error instanceof ThemeError ? error.message : 'Something went wrong. Please try again.'
}

/** Saves the design as a JSON file the admin can import here or in another business. */
function download(theme: Theme, fileName: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  // Some browsers start the download after click() returns; freeing the file right away could cancel it.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
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
  const [busy, setBusy] = useState<'saving' | 'publishing' | 'importing' | null>(null)
  const [history, setHistory] = useState<HistoryState>({ versions: null, error: null })
  const [historyKey, setHistoryKey] = useState(0)
  const importInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [section, setSection] = useState<EditorSection>('templates')

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

  useEffect(() => {
    let active = true
    fetchThemeVersions()
      .then((loaded) => {
        if (!active) return
        // Restoring a version shows its images in the preview even when the draft no longer uses them.
        setLocalUrls((urls) => ({ ...loaded.image_urls, ...urls }))
        setHistory({ versions: loaded.versions, error: null })
      })
      .catch((caught: unknown) => {
        if (active) setHistory({ versions: null, error: messageOf(caught) })
      })
    return () => {
      active = false
    }
  }, [historyKey])

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
    setNotice(`${preset.name} applied to the draft. Adjust anything in the other sections, then save or publish.`)
  }

  function restore(version: ThemeVersion) {
    setDraft(version.theme)
    setNotice(`Version ${version.number} is in the draft. Publish it to show it on the tables again.`)
  }

  function reset() {
    setDraft(withDefaults(theme, saved.presets))
    setNotice('Colors, fonts, layout and cards are back to the defaults; your name, texts and images stay. Save or publish to keep it.')
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // choosing the same file again imports it again
    if (!file) return
    setBusy('importing')
    try {
      const imported = await importTheme(readThemeFile(await file.text()))
      setLocalUrls((urls) => ({ ...urls, ...imported.image_urls }))
      setDraft(imported.theme)
      setError(null)
      const warning = removedImagesText(imported.removed_images)
      setNotice(`Design imported into the draft. Adjust it, then save or publish.${warning ? ` ${warning}` : ''}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : messageOf(caught))
    }
    setBusy(null)
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
        setHistoryKey((key) => key + 1)
      } catch (caught) {
        setError(messageOf(caught))
      }
    }
    setBusy(null)
  }

  const panels: Record<EditorSection, ReactNode> = {
    templates: (
      <PresetGallery presets={saved.presets} selected={matchingPreset(theme, saved.presets)} onApply={applyPreset} />
    ),
    colors: <ColorControls theme={theme} defaults={saved.defaults} onChange={edit} />,
    brand: (
      <BrandControls theme={theme} imageUrls={imageUrls} businessName={businessName} onChange={edit} onUpload={upload} />
    ),
    typography: <TypographyControls theme={theme} onChange={edit} />,
    layout: <LayoutControls theme={theme} onChange={edit} />,
    cards: <CardControls theme={theme} onChange={edit} />,
    versions: (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy !== null} onClick={reset}>
            Reset to defaults
          </Button>
          <Button onClick={() => download(theme, themeFileName(businessName, new Date()))}>Export design</Button>
          <Button disabled={busy !== null} onClick={() => importInput.current?.click()}>
            {busy === 'importing' ? 'Importing…' : 'Import design'}
          </Button>
          <input
            ref={importInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Design file to import"
            onChange={(event) => void handleImport(event)}
          />
        </div>
        <ThemeHistory
          versions={history.versions}
          error={history.error}
          onRestore={restore}
          onRetry={() => {
            setHistory({ versions: null, error: null })
            setHistoryKey((key) => key + 1)
          }}
        />
      </div>
    ),
  }
  const current = SECTIONS.find((option) => option.id === section) ?? SECTIONS[0]

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Design"
        description={<span role="status">{statusText(saved, dirty)}</span>}
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

      {(error || notice) && (
        <div className="space-y-2">
          {error && <ErrorText>{error}</ErrorText>}
          {notice && <SuccessText>{notice}</SuccessText>}
        </div>
      )}

      {/* Wide screens: sections | preview | options, the last two pinned so nothing needs scrolling back. */}
      <div className="grid gap-4 lg:grid-cols-[10rem_minmax(0,1fr)_25rem] lg:items-start lg:gap-6">
        <nav aria-label="Design sections" className="min-w-0 lg:sticky lg:top-24">
          <ul role="tablist" aria-orientation="vertical" className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:pb-0">
            {SECTIONS.map((option) => (
              <li key={option.id} role="presentation" className="shrink-0">
                <button
                  type="button"
                  role="tab"
                  id={`design-tab-${option.id}`}
                  aria-selected={section === option.id}
                  aria-controls="design-options"
                  onClick={() => setSection(option.id)}
                  className={`inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap active:scale-[0.98] ${MOTION} ${
                    section === option.id ? 'bg-action text-action-ink' : 'text-ink-soft hover:bg-subtle hover:text-ink'
                  }`}
                >
                  {option.icon}
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <aside aria-label="Preview" className="order-last min-w-0 lg:sticky lg:top-24 lg:order-none">
          <ThemePreview theme={theme} imageUrls={imageUrls} businessName={businessName} />
        </aside>

        <Card className="@container min-w-0 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
          <section
            id="design-options"
            role="tabpanel"
            aria-labelledby={`design-tab-${current.id}`}
            className="space-y-4 p-4"
          >
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-ink">{current.label}</h2>
              <p className="text-sm text-pretty text-muted">{current.description}</p>
            </div>
            {panels[current.id]}
          </section>
        </Card>
      </div>
    </div>
  )
}
