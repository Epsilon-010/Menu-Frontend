import { CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

/** Inline error next to what failed: says what went wrong and what to do. */
export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 text-sm text-red-700">
      <WarningCircleIcon size={16} className="mt-0.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

export function SuccessText({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="flex items-start gap-2 text-sm text-emerald-700">
      <CheckCircleIcon size={16} className="mt-0.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

type BadgeTone = 'neutral' | 'warning' | 'success'

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-subtle text-ink-soft',
  warning: 'bg-amber-100 text-amber-800',
  success: 'bg-emerald-100 text-emerald-800',
}

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  )
}

/** Placeholder block shaped like the content it stands for. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-line/70 ${className}`} />
}

/** A list of row skeletons inside a card, for panels that load a list. */
export function ListSkeleton({ rows = 3, label }: { rows?: number; label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-2 rounded-2xl border border-line bg-surface p-2">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 p-3">
          <Skeleton className="h-10 w-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/5" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  )
}

interface EmptyStateProps {
  icon: ReactNode
  title: string
  children: ReactNode
  action?: ReactNode
}

/** A composed starting point instead of a blank panel. */
export function EmptyState({ icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-subtle text-ink-soft">{icon}</div>
      <div className="max-w-sm space-y-2">
        <h3 className="font-semibold text-ink">{title}</h3>
        <p className="text-sm text-muted">{children}</p>
      </div>
      {action}
    </div>
  )
}

interface LoadErrorProps {
  message: string
  onRetry: () => void
}

export function LoadError({ message, onRetry }: LoadErrorProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4">
      <ErrorText>{message}</ErrorText>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg px-3 py-2 text-sm font-semibold text-red-800 transition duration-300 ease-smooth hover:bg-red-100 active:scale-[0.98]"
      >
        Try again
      </button>
    </div>
  )
}
