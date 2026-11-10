import {
  CardsIcon,
  ClockCounterClockwiseIcon,
  LayoutIcon,
  PaletteIcon,
  RowsIcon,
  SquaresFourIcon,
  StorefrontIcon,
  TextAaIcon,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useBlocker } from 'react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs.tsx'
import { cn } from '../../lib/utils.ts'
import { Button } from '../../shared/ui/Button.tsx'
import { ErrorText, ListSkeleton, LoadError, SuccessText } from '../../shared/ui/Feedback.tsx'
import { ConfirmDialog } from '../../shared/ui/RowActions.tsx'
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
import { PageControls } from './PageControls.tsx'
import { PresetGallery } from './PresetGallery.tsx'
import { ThemePreview } from './ThemePreview.tsx'
import { CardControls } from './CardControls.tsx'
import { LayoutControls } from './LayoutControls.tsx'
import { ThemeHistory } from './ThemeHistory.tsx'
import { leavesWithUnsavedChanges } from './ThemeEditorPanel.leaving.ts'
import { TypographyControls } from './TypographyControls.tsx'

type EditorSection = 'templates' | 'page' | 'colors' | 'brand' | 'typography' | 'layout' | 'cards' | 'versions'

const SECTIONS: { id: EditorSection; label: string; description: string; icon: ReactNode }[] = [
  {
    id: 'templates',
    label: 'Plantillas',
    description: 'Elige un diseño completo para empezar; tu nombre, logo e imágenes se conservan.',
    icon: <SquaresFourIcon size={16} aria-hidden />,
  },
  {
    id: 'page',
    label: 'Página',
    description: 'Arma tu menú con secciones: destacados, textos, separadores y tus productos.',
    icon: <RowsIcon size={16} aria-hidden />,
  },
  { id: 'colors', label: 'Colores', description: 'La paleta del menú, en modo claro u oscuro.', icon: <PaletteIcon size={16} aria-hidden /> },
  {
    id: 'brand',
    label: 'Marca',
    description: 'Nombre, textos, logo, banner y fondo.',
    icon: <StorefrontIcon size={16} aria-hidden />,
  },
  {
    id: 'typography',
    label: 'Tipografía',
    description: 'Fuentes y cómo se ve cada texto del menú.',
    icon: <TextAaIcon size={16} aria-hidden />,
  },
  {
    id: 'layout',
    label: 'Distribución',
    description: 'Navegación de categorías, vista de productos, columnas y barra del pedido.',
    icon: <LayoutIcon size={16} aria-hidden />,
  },
  {
    id: 'cards',
    label: 'Tarjetas de producto',
    description: 'Forma, imagen, etiquetas y botón de agregar de cada producto.',
    icon: <CardsIcon size={16} aria-hidden />,
  },
  {
    id: 'versions',
    label: 'Versiones',
    description: 'Vuelve a un diseño publicado, empieza de nuevo con los valores por defecto o pasa un diseño a otro negocio.',
    icon: <ClockCounterClockwiseIcon size={16} aria-hidden />,
  },
]

type LoadState ={ status: 'loading' } | { status: 'error'; message: string } | { status: 'loaded'; saved: ThemeDraftState }

type HistoryState = { versions: ThemeVersion[] | null; error: string | null }

function messageOf(error: unknown): string {
  return error instanceof ThemeError ? error.message : 'Algo salió mal. Inténtalo de nuevo.'
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
  if (dirty) return 'Cambios sin guardar.'
  if (saved.has_unpublished_changes) return 'Borrador guardado. Publícalo para mostrarlo en las mesas.'
  if (saved.published_at) return `Publicado el ${new Date(saved.published_at).toLocaleString()}. Las mesas muestran este diseño.`
  return 'Las mesas muestran el diseño por defecto.'
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
  // The page section being edited: picked in the "Página" panel or by clicking it in the preview.
  const [pageSection, setPageSection] = useState<string | null>(null)

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

  const dirty = load.status === 'loaded' && draft !== null && !sameTheme(draft, load.saved.draft)
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    leavesWithUnsavedChanges(dirty, currentLocation.pathname, nextLocation.pathname),
  )

  // Closing or reloading the tab is outside the router: only the browser's own prompt can ask.
  useEffect(() => {
    if (!dirty) return
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = '' // older tablet browsers only ask when this is set
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  if (load.status === 'loading' || (load.status === 'loaded' && draft === null)) {
    return <ListSkeleton rows={3} label="Cargando el diseño del menú" />
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
  const imageUrls = { ...saved.image_urls, ...localUrls }

  function edit(next: Theme) {
    setDraft(next)
    setNotice(null)
  }

  function applyPreset(preset: ThemePreset) {
    setDraft(withPreset(theme, preset))
    setNotice(`${preset.name} se aplicó al borrador. Ajusta lo que quieras en las otras secciones y luego guarda o publica.`)
  }

  function restore(version: ThemeVersion) {
    setDraft(version.theme)
    setNotice(`La versión ${version.number} está en el borrador. Publícala para mostrarla de nuevo en las mesas.`)
  }

  function reset() {
    setDraft(withDefaults(theme, saved.presets))
    setNotice('Los colores, fuentes, distribución y tarjetas volvieron a los valores por defecto; tu nombre, textos e imágenes se conservan. Guarda o publica para mantenerlo.')
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
      setNotice(`Diseño importado al borrador. Ajústalo y luego guarda o publica.${warning ? ` ${warning}` : ''}`)
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
    if (await save()) setNotice('Borrador guardado. Las mesas siguen mostrando el diseño publicado.')
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
        setNotice('Publicado. Las mesas mostrarán el nuevo diseño en menos de un minuto.')
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
    page: (
      <PageControls theme={theme} onChange={edit} selectedId={pageSection} onSelect={setPageSection} onOpen={setSection} />
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
            Restablecer valores por defecto
          </Button>
          <Button onClick={() => download(theme, themeFileName(businessName, new Date()))}>Exportar diseño</Button>
          <Button disabled={busy !== null} onClick={() => importInput.current?.click()}>
            {busy === 'importing' ? 'Importando…' : 'Importar diseño'}
          </Button>
          <input
            ref={importInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Archivo de diseño para importar"
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
        title="Diseño"
        description={<span role="status" className={dirty ? 'font-semibold text-warning' : undefined}>{statusText(saved, dirty)}</span>}
        action={
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy !== null || !dirty} onClick={() => void handleSave()}>
              {busy === 'saving' ? 'Guardando…' : 'Guardar borrador'}
            </Button>
            <Button
              variant="primary"
              disabled={busy !== null || (!dirty && !saved.has_unpublished_changes && saved.published_at !== null)}
              onClick={() => void handlePublish()}
            >
              {busy === 'publishing' ? 'Publicando…' : 'Publicar'}
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
      <Tabs
        value={section}
        onValueChange={(value) => setSection(value as EditorSection)}
        orientation="vertical"
        className="grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)_25rem] lg:items-start lg:gap-6"
      >
        <nav aria-label="Secciones del diseño" className="min-w-0 lg:sticky lg:top-24">
          <TabsList className="flex w-full justify-start overflow-x-auto lg:flex-col lg:items-stretch">
            {SECTIONS.map((option) => (
              <TabsTrigger
                key={option.id}
                value={option.id}
                className={cn(
                  'shrink-0 justify-start',
                  // The active section is marked by a short bar in the action color: under it on small screens,
                  // at its left in the vertical rail.
                  'after:absolute after:inset-x-3 after:bottom-0.5 after:h-0.5 after:rounded-full after:bg-action after:opacity-0',
                  'lg:after:inset-x-auto lg:after:inset-y-2 lg:after:bottom-auto lg:after:left-0.5 lg:after:h-auto lg:after:w-0.5',
                  'after:transition-opacity after:duration-300 after:ease-smooth data-[state=active]:after:opacity-100',
                )}
              >
                {option.icon}
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </nav>

        <aside aria-label="Vista previa" className="order-last min-w-0 lg:sticky lg:top-24 lg:order-none">
          <ThemePreview
            theme={theme}
            imageUrls={imageUrls}
            businessName={businessName}
            selectedSection={section === 'page' ? pageSection : null}
            onSelectSection={(id) => {
              setPageSection(id)
              setSection('page')
            }}
          />
        </aside>

        <Card className="@container min-w-0 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
          <TabsContent value={current.id} className="space-y-4 p-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-ink">{current.label}</h2>
              <p className="text-sm text-pretty text-muted">{current.description}</p>
            </div>
            {panels[current.id]}
          </TabsContent>
        </Card>
      </Tabs>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onCancel={() => blocker.reset?.()}
        title="¿Salir sin guardar?"
        cancelLabel="Seguir editando"
        confirmLabel="Salir sin guardar"
        confirmVariant="danger"
        onConfirm={() => blocker.proceed?.()}
        busy={false}
      >
        Tienes cambios sin guardar en el diseño. Si sales ahora, se pierden.
      </ConfirmDialog>
    </div>
  )
}
