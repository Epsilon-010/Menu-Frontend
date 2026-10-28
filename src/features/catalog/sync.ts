/**
 * Keeps the catalog panel consistent when the admin acts on several rows quickly.
 *
 * Every change rebuilds a full-list payload (a reorder sends every id) from the catalog it last
 * loaded, so two changes in flight could undo each other and two reloads could land out of order.
 * Changes therefore run one at a time, and only the newest reload is applied.
 */

/** Runs tasks one after another, in the order they were queued; a failure never blocks the next one. */
export function createSerialQueue(): <T>(task: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve()
  return <T>(task: () => Promise<T>): Promise<T> => {
    const run = tail.then(task, task)
    tail = run.catch(() => undefined)
    return run
  }
}

interface ChangeRunnerDeps<Catalog> {
  enqueue: <T>(task: () => Promise<T>) => Promise<T>
  /** The catalog as last loaded, read when a queued change actually runs. */
  current: () => Catalog
  /** Reloads the catalog; resolves to an error message, or null when it loaded. */
  reload: () => Promise<string | null>
  messageOf: (error: unknown) => string
  /** The change was saved but the screen could not refresh: show it, without calling it a failure. */
  onStale: (message: string) => void
}

/**
 * Runs each change after the previous one, then reloads. A change that the server saved is always
 * reported as a success, even if the reload fails: treating it as a failure would keep the form
 * open and invite pressing it again (a duplicate create).
 */
export function createChangeRunner<Catalog>(deps: ChangeRunnerDeps<Catalog>) {
  return (action: (current: Catalog) => Promise<unknown>): Promise<string | null> =>
    deps.enqueue(async () => {
      try {
        await action(deps.current())
      } catch (error) {
        // Reload even after a failure: another tab may have changed the catalog.
        await deps.reload()
        return deps.messageOf(error)
      }
      const reloadFailure = await deps.reload()
      if (reloadFailure !== null) deps.onStale(reloadFailure)
      return null
    })
}

export interface LatestOnly {
  /** Starts a request; `apply` and `fail` run only if no newer request started meanwhile. */
  run<T>(request: () => Promise<T>, apply: (value: T) => void, fail?: (error: unknown) => void): Promise<void>
  /** Drops every pending response (for example when the component unmounts). */
  cancel(): void
}

export function createLatestOnly(): LatestOnly {
  let latest = 0
  return {
    async run(request, apply, fail) {
      const ticket = ++latest
      try {
        const value = await request()
        if (ticket === latest) apply(value)
      } catch (error) {
        if (ticket === latest) fail?.(error)
      }
    },
    cancel() {
      latest += 1
    },
  }
}
