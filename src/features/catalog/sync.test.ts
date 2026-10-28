import { describe, expect, it } from 'vitest'
import { createChangeRunner, createLatestOnly, createSerialQueue } from './sync.ts'

/** A promise the test resolves or rejects by hand, to control completion order. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('createSerialQueue', () => {
  it('runs each task only after the previous one finished, in queue order', async () => {
    const enqueue = createSerialQueue()
    const first = deferred<string>()
    const log: string[] = []

    const a = enqueue(async () => {
      log.push('a start')
      const value = await first.promise
      log.push('a end')
      return value
    })
    const b = enqueue(async () => {
      log.push('b start')
      return 'b'
    })
    await Promise.resolve()
    expect(log).toEqual(['a start'])

    first.resolve('a')
    expect(await a).toBe('a')
    expect(await b).toBe('b')
    expect(log).toEqual(['a start', 'a end', 'b start'])
  })

  it('keeps going after a task fails and reports the failure to its caller only', async () => {
    const enqueue = createSerialQueue()

    const failing = enqueue(async () => {
      throw new Error('boom')
    })
    const next = enqueue(async () => 'still runs')

    await expect(failing).rejects.toThrow('boom')
    expect(await next).toBe('still runs')
  })
})

describe('createLatestOnly', () => {
  it('applies only the newest response when an older one arrives later', async () => {
    const latest = createLatestOnly()
    const older = deferred<string>()
    const newer = deferred<string>()
    const applied: string[] = []

    const first = latest.run(() => older.promise, (value) => applied.push(value))
    const second = latest.run(() => newer.promise, (value) => applied.push(value))
    newer.resolve('new')
    await second
    older.resolve('old')
    await first

    expect(applied).toEqual(['new'])
  })

  it('reports a failure only when it belongs to the newest request', async () => {
    const latest = createLatestOnly()
    const older = deferred<string>()
    const failures: unknown[] = []

    const first = latest.run(() => older.promise, () => {}, (error) => failures.push(error))
    await latest.run(() => Promise.reject(new Error('newest failed')), () => {}, (error) => failures.push(error))
    older.reject(new Error('stale failure'))
    await first

    expect(failures).toHaveLength(1)
    expect((failures[0] as Error).message).toBe('newest failed')
  })

  it('ignores every pending response after cancel (the panel unmounted)', async () => {
    const latest = createLatestOnly()
    const pending = deferred<string>()
    const applied: string[] = []

    const run = latest.run(() => pending.promise, (value) => applied.push(value))
    latest.cancel()
    pending.resolve('late')
    await run

    expect(applied).toEqual([])
  })
})

describe('createChangeRunner', () => {
  type Snapshot = string[]

  function setup(reloadResults: (string | null)[]) {
    let catalog: Snapshot = ['v0']
    const stale: string[] = []
    const runner = createChangeRunner<Snapshot>({
      enqueue: createSerialQueue(),
      current: () => catalog,
      reload: async () => {
        const failure = reloadResults.shift() ?? null
        if (failure === null) catalog = [`v${Number(catalog[0].slice(1)) + 1}`]
        return failure
      },
      messageOf: (error) => (error instanceof Error ? error.message : 'unknown'),
      onStale: (message) => stale.push(message),
    })
    return { runner, stale, seen: () => catalog }
  }

  it('reports success and reloads after a change', async () => {
    const { runner, stale, seen } = setup([null])

    expect(await runner(async () => {})).toBeNull()
    expect(seen()).toEqual(['v1'])
    expect(stale).toEqual([])
  })

  it('treats a saved change whose reload failed as a success and flags the panel as stale', async () => {
    const { runner, stale } = setup(['offline'])

    // Not an error: the form must close, or pressing it again would create a duplicate.
    expect(await runner(async () => {})).toBeNull()
    expect(stale).toEqual(['offline'])
  })

  it('reports a failed change and still reloads the catalog', async () => {
    const { runner, seen } = setup([null])

    expect(
      await runner(async () => {
        throw new Error('Category name already in use.')
      }),
    ).toBe('Category name already in use.')
    expect(seen()).toEqual(['v1'])
  })

  it('gives each queued change the catalog loaded after the previous one', async () => {
    const { runner } = setup([null, null])
    const seenByChanges: Snapshot[] = []

    await Promise.all([
      runner(async (current) => void seenByChanges.push(current)),
      runner(async (current) => void seenByChanges.push(current)),
    ])

    expect(seenByChanges).toEqual([['v0'], ['v1']])
  })
})
