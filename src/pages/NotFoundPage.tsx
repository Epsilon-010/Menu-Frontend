import { ArrowLeftIcon, ForkKnifeIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { buttonClass } from '../shared/ui/classes.ts'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-950 text-white">
        <ForkKnifeIcon size={24} weight="bold" aria-hidden />
      </span>
      <div className="max-w-md space-y-2">
        <p className="font-mono text-sm text-zinc-500">404</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">This page is not on the menu</h1>
        <p className="text-zinc-500">The link may be old or mistyped. Go back and pick another page.</p>
      </div>
      <Link to="/" className={buttonClass('primary', 'md')}>
        <ArrowLeftIcon size={16} aria-hidden />
        Back to the start
      </Link>
    </main>
  )
}
