import { QrCodeIcon } from '@phosphor-icons/react'
import type { VisitEndReason } from './authContext.ts'

const COPY: Record<VisitEndReason, { title: string; body: string }> = {
  ended: {
    title: 'Your visit at this table has ended',
    body: 'Thanks for coming. To order again, ask your waiter to open the table and scan its QR code.',
  },
  left: {
    title: 'You left the table',
    body: 'Your orders stay with the table. To come back, scan the table QR code again.',
  },
}

/** Closing screen for a guest whose session is over. On purpose it links nowhere: only a new scan gets back in. */
export function VisitEndedScreen({ reason }: { reason: VisitEndReason }) {
  const { title, body } = COPY[reason]
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="flex max-w-sm flex-col items-center gap-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-950 text-white">
          <QrCodeIcon size={24} weight="bold" aria-hidden />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-balance text-zinc-950">{title}</h1>
          <p className="text-sm text-pretty text-zinc-500">{body}</p>
        </div>
      </div>
    </main>
  )
}
