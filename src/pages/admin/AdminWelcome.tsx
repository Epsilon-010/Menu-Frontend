import { ArrowRightIcon, ChairIcon, ChartBarIcon, PaletteIcon, UsersThreeIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { MOTION } from '../../shared/ui/classes.ts'

const SHORTCUTS: { to: string; title: string; body: string; icon: ReactNode; tile: string }[] = [
  { to: '/admin/tables', title: 'Mesas', body: 'Códigos QR y tablets', icon: <ChairIcon size={24} weight="fill" aria-hidden />, tile: 'bg-brand text-brand-ink' },
  { to: '/admin/design', title: 'Diseño', body: 'Colores y plantillas', icon: <PaletteIcon size={24} weight="fill" aria-hidden />, tile: 'bg-accent text-white' },
  { to: '/admin/staff', title: 'Personal', body: 'Meseros y cocina', icon: <UsersThreeIcon size={24} weight="fill" aria-hidden />, tile: 'bg-sun text-ink' },
  { to: '/admin/stats', title: 'Estadísticas', body: 'Ventas y tiempos', icon: <ChartBarIcon size={24} weight="fill" aria-hidden />, tile: 'bg-leaf text-white' },
]

/** The first thing an admin sees: a greeting in the brand colors and the sections used most. */
export function AdminWelcome({ name, business }: { name: string; business: string }) {
  const firstName = name.trim().split(/\s+/)[0]

  return (
    <div className="mb-8 space-y-4">
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand to-accent p-6 text-white shadow-xl shadow-brand/20 motion-safe:animate-card-rise sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -top-20 -right-12 size-64 rounded-full border-[32px] border-white/10" />
        <div aria-hidden className="pointer-events-none absolute right-32 -bottom-24 size-48 rounded-full bg-sun/30 blur-2xl" />
        <div className="relative space-y-2">
          <p className="text-sm font-semibold text-white/85">{business}</p>
          <p className="text-3xl font-semibold tracking-tight">Hola, {firstName}</p>
          <p className="max-w-xl text-base text-white/90">Aquí administras tu menú. Lo que cambies se ve en las mesas al momento.</p>
        </div>
      </section>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {SHORTCUTS.map((shortcut, index) => (
          <li key={shortcut.to} className="motion-safe:animate-card-rise" style={{ animationDelay: `${(index + 1) * 60}ms` }}>
            <Link
              to={shortcut.to}
              className={`group flex h-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-xs hover:-translate-y-1 hover:border-line-strong hover:shadow-lg hover:shadow-brand/10 active:scale-[0.98] ${MOTION}`}
            >
              <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl group-hover:scale-110 group-hover:-rotate-6 ${MOTION} ${shortcut.tile}`}>
                {shortcut.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{shortcut.title}</span>
                <span className="block truncate text-xs text-muted">{shortcut.body}</span>
              </span>
              <ArrowRightIcon size={16} aria-hidden className={`hidden text-faint group-hover:translate-x-1 group-hover:text-brand sm:block ${MOTION}`} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
