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
