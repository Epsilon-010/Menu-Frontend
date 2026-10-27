import { describe, expect, it } from 'vitest'
import { createLatestOnly, createSerialQueue } from './sync.ts'

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
