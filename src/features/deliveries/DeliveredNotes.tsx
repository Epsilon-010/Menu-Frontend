import { CheckCircleIcon, NoteIcon } from '@phosphor-icons/react'
import { clockTime } from '../ordering/logic.ts'
import type { DeliveredNote } from './logic.ts'

interface DeliveredNotesProps {
  notes: DeliveredNote[]
}

/**
 * Orders the waiter already took to the tables, as notes that stay until the bill is paid: a fully delivered
 * order leaves the delivery queue but is still here.
 */
export function DeliveredNotes({ notes }: DeliveredNotesProps) {
  return (
    <section aria-labelledby="delivered-title" className="space-y-4">
      <div className="space-y-1">
        <h2 id="delivered-title" className="text-xl font-semibold tracking-tight text-ink">
          Entregadas
        </h2>
        <p className="text-sm text-muted">Lo que ya llevaste a cada mesa. Se quita al cobrar la cuenta.</p>
      </div>

      {notes.length === 0 ? (
        <p className="flex items-center gap-2 rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
          <NoteIcon size={18} aria-hidden />
          Todavía no entregas nada en las mesas abiertas.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <li key={note.order_id} className="space-y-3 rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-ink">
                  {note.table_name} · Orden #{note.order_number}
                </p>
                <span className="shrink-0 text-sm text-muted tabular-nums">{clockTime(note.sent_at)}</span>
              </div>
              <ul className="space-y-1 text-sm text-ink-soft">
                {note.delivered.map((line, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircleIcon size={16} weight="fill" aria-hidden className="mt-0.5 shrink-0 text-emerald-600" />
                    {line}
                  </li>
                ))}
              </ul>
              <p className={`text-sm font-semibold ${note.pending === 0 ? 'text-emerald-700' : 'text-amber-800'}`}>
                {note.pending === 0
                  ? 'Orden completa'
                  : note.pending === 1
                    ? 'Falta 1 platillo'
                    : `Faltan ${note.pending} platillos`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
