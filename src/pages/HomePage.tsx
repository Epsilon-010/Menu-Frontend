import { ArrowRightIcon, ForkKnifeIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { fetchHealth, type HealthResponse } from '../shared/api/health.ts'
import { buttonClass } from '../shared/ui/classes.ts'
import { Skeleton } from '../shared/ui/Feedback.tsx'

type HealthState =
  | { kind: 'loading' }
  | { kind: 'loaded'; health: HealthResponse }
  | { kind: 'error' }

export function HomePage() {
  const [state, setState] = useState<HealthState>({ kind: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    fetchHealth(controller.signal)
      .then((health) => setState({ kind: 'loaded', health }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ kind: 'error' })
      })
    return () => controller.abort()
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 px-4 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-950 text-white">
        <ForkKnifeIcon size={24} weight="bold" aria-hidden />
      </span>
      <div className="max-w-[680px] space-y-6">
        <h1 className="bg-gradient-to-r from-black to-[#666666] bg-clip-text text-5xl font-semibold tracking-tight text-transparent">
          Tu menú en cada mesa,
          <br />
          tus órdenes directo a la cocina
        </h1>
        <p className="mx-auto max-w-[680px] text-lg text-zinc-500">
          Los comensales piden desde una tablet en su mesa, la cocina libera cada platillo en cuanto está listo y nadie
          espera a que un mesero tome la orden.
        </p>
        <Link to="/login" className={buttonClass('primary', 'md')}>
          Inicia sesión en tu restaurante
          <ArrowRightIcon size={16} aria-hidden />
        </Link>
      </div>
      <ApiStatus state={state} />
    </main>
  )
}

function ApiStatus({ state }: { state: HealthState }) {
  if (state.kind === 'loading') {
    return <Skeleton className="h-8 w-64 rounded-full" />
  }
  if (state.kind === 'error') {
    return <p className="rounded-full bg-red-50 px-4 py-2 text-sm text-red-700">El servidor no responde en este momento.</p>
  }
  return (
    <ul className="flex flex-wrap justify-center gap-2 text-sm">
      {Object.entries(state.health.checks).map(([name, status]) => (
        <li key={name} className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-zinc-600">
          <span aria-hidden className={`h-2 w-2 rounded-full ${status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className="capitalize">{name}</span>
          <span className="sr-only">{status === 'ok' ? 'disponible' : 'no disponible'}</span>
        </li>
      ))}
    </ul>
  )
}
