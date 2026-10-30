import { Button } from '../../shared/ui/Button.tsx'
import { Badge, ListSkeleton, LoadError } from '../../shared/ui/Feedback.tsx'
import type { ThemeVersion } from './api.ts'

interface ThemeHistoryProps {
  /** Newest first; null while loading. */
  versions: ThemeVersion[] | null
  error: string | null
  onRestore: (version: ThemeVersion) => void
  onRetry: () => void
}

/** The last published designs. Restoring one puts it in the draft; the tables change only when it is published. */
export function ThemeHistory({ versions, error, onRestore, onRetry }: ThemeHistoryProps) {
  if (error) return <LoadError message={error} onRetry={onRetry} />
  if (versions === null) return <ListSkeleton rows={2} label="Loading the published versions" />
  if (versions.length === 0) {
    return <p className="text-sm text-muted">Nothing published yet. Each time you publish, the design is kept here.</p>
  }
  return (
    <ul className="divide-y divide-line rounded-xl border border-line">
      {versions.map((version, index) => (
        <li key={version.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="min-w-0 space-y-0.5">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              Version {version.number}
              {index === 0 && <Badge tone="success">On the tables</Badge>}
            </p>
            <p className="text-sm text-muted">Published on {new Date(version.published_at).toLocaleString()}</p>
          </div>
          <Button onClick={() => onRestore(version)}>Restore</Button>
        </li>
      ))}
    </ul>
  )
}
