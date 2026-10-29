import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  description: ReactNode
  action?: ReactNode
}

/** Title and purpose of an admin section. */
export function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="text-sm text-muted">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl border border-line bg-surface ${className}`}>{children}</div>
}
