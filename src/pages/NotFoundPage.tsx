import { ArrowLeftIcon, ForkKnifeIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { buttonClass } from '../shared/ui/classes.ts'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-brand-ink">
        <ForkKnifeIcon size={24} weight="bold" aria-hidden />
      </span>
      <div className="max-w-md space-y-2">
        <p className="font-mono text-sm text-muted">404</p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Esta página no está en el menú</h1>
        <p className="text-muted">Puede que el enlace sea viejo o tenga un error. Regresa y elige otra página.</p>
      </div>
      <Link to="/" className={buttonClass('primary', 'md')}>
        <ArrowLeftIcon size={16} aria-hidden />
        Volver al inicio
      </Link>
    </main>
  )
}
