import { ArrowRightIcon, ChairIcon, ChartBarIcon, PaletteIcon, UsersThreeIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { MOTION } from '../../shared/ui/classes.ts'

const SHORTCUTS: { to: string; title: string; body: string; icon: ReactNode }[] = [
  { to: '/admin/tables', title: 'Mesas', body: 'Códigos QR y tablets', icon: <ChairIcon size={24} weight="fill" aria-hidden /> },
  { to: '/admin/design', title: 'Diseño', body: 'Colores y plantillas', icon: <PaletteIcon size={24} weight="fill" aria-hidden /> },
  { to: '/admin/staff', title: 'Personal', body: 'Meseros y cocina', icon: <UsersThreeIcon size={24} weight="fill" aria-hidden /> },
  { to: '/admin/stats', title: 'Estadísticas', body: 'Ventas y tiempos', icon: <ChartBarIcon size={24} weight="fill" aria-hidden /> },
]

/** The first thing an admin sees: a plain greeting and the sections used most. */
export function AdminWelcome({ name, business }: { name: string; business: string }) {
  const firstName = name.trim().split(/\s+/)[0]

  return (
    <div className="mb-8 space-y-4">
      <section className="space-y-1 motion-safe:animate-card-rise">
        <p className="text-sm font-semibold text-brand">{business}</p>
        <p className="text-4xl font-semibold tracking-tight text-ink">Hola, {firstName}</p>
        <p className="max-w-xl text-base text-muted">Aquí administras tu menú. Lo que cambies se ve en las mesas al momento.</p>
      </section>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {SHORTCUTS.map((shortcut, index) => (
          <li key={shortcut.to} className="motion-safe:animate-card-rise" style={{ animationDelay: `${(index + 1) * 60}ms` }}>
            <Link
              to={shortcut.to}
              className={`group flex h-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-xs hover:-translate-y-1 hover:border-line-strong hover:shadow-lg hover:shadow-brand/10 active:scale-[0.98] ${MOTION}`}
            >
              <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand ${MOTION}`}>
                {shortcut.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{shortcut.title}</span>
                <span className="block text-xs text-muted">{shortcut.body}</span>
              </span>
              <ArrowRightIcon size={16} aria-hidden className={`hidden text-faint group-hover:translate-x-1 group-hover:text-brand sm:block ${MOTION}`} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
