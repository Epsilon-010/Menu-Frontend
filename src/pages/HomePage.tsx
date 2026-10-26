import { useEffect, useState } from 'react'
import { fetchHealth, type HealthResponse } from '../shared/api/health.ts'

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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Menu</h1>
        <p className="mt-2 text-slate-600">Self-service digital menu for restaurants.</p>
        <ApiStatus state={state} />
      </section>
    </main>
  )
}

function ApiStatus({ state }: { state: HealthState }) {
  if (state.kind === 'loading') {
    return <p className="mt-6 text-sm text-slate-500">Checking API…</p>
  }
  if (state.kind === 'error') {
    return <p className="mt-6 text-sm text-red-600">API unreachable</p>
  }
  return (
    <ul className="mt-6 space-y-1 text-sm">
      {Object.entries(state.health.checks).map(([name, status]) => (
        <li key={name} className="flex justify-between">
          <span className="capitalize text-slate-700">{name}</span>
          <span className={status === 'ok' ? 'text-emerald-600' : 'text-red-600'}>{status}</span>
        </li>
      ))}
    </ul>
  )
}
