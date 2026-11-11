import { ArrowClockwiseIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { useRouteError } from 'react-router'
import { buttonClass } from '../shared/ui/classes.ts'

interface RouteErrorScreenProps {
  onReload: () => void
}

/** A small neutral screen (no business theme: the theme may be what failed) with a way back to a working page. */
export function RouteErrorScreen({ onReload }: RouteErrorScreenProps) {
  return (
    <main role="alert" className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-brand-ink">
        <WarningCircleIcon size={24} weight="bold" aria-hidden />
      </span>
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Algo salió mal</h1>
        <p className="text-muted">No se pudo mostrar esta pantalla. Recarga para intentarlo de nuevo.</p>
      </div>
      <button type="button" onClick={onReload} className={buttonClass('primary', 'md')}>
        <ArrowClockwiseIcon size={16} aria-hidden />
        Recargar
      </button>
    </main>
  )
}

/** The router's error element: a render error on any page shows this instead of React Router's developer page. */
export function RouteError() {
  const error = useRouteError()
  useEffect(() => {
    console.error(error)
  }, [error])
  return <RouteErrorScreen onReload={() => window.location.reload()} />
}
