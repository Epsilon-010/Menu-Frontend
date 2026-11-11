import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  /** Drawn on a tile in the brand colors before the title. */
  icon?: ReactNode
  description: ReactNode
  action?: ReactNode
}

/** Title and purpose of an admin section. */
export function SectionHeader({ title, icon, description, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex max-w-2xl items-start gap-4">
        {icon && (
          <span
            aria-hidden
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-brand to-accent text-white shadow-lg shadow-brand/25"
          >
            {icon}
          </span>
        )}
        <div className="min-w-0 space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="text-sm text-muted">{description}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-3xl border border-line/60 bg-surface shadow-sm shadow-brand/5 ${className}`}>{children}</div>
}
