import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { menuAfterFailure, menuAfterLoad, MENU_REFRESH_MS, scheduleMenuRefresh } from './menuFreshness.ts'

describe('menuAfterLoad', () => {
  it('shows a new menu', () => {
    const data = [{ id: 'c1' }]

    expect(menuAfterLoad({ status: 'loading' }, data)).toEqual({ status: 'loaded', data })
  })

  it('keeps the same object when nothing changed, so an open card is not disturbed', () => {
    const current = { status: 'loaded' as const, data: [{ id: 'c1' }] }

    expect(menuAfterLoad(current, [{ id: 'c1' }])).toBe(current)
  })

  it('replaces the menu when something changed', () => {
    const current = { status: 'loaded' as const, data: [{ id: 'c1' }] }

    expect(menuAfterLoad(current, [{ id: 'c2' }])).toEqual({ status: 'loaded', data: [{ id: 'c2' }] })
  })
})

describe('menuAfterFailure', () => {
  it('keeps the menu on screen when a background refresh fails', () => {
    const current = { status: 'loaded' as const, data: [{ id: 'c1' }] }

    expect(menuAfterFailure(current, 'offline')).toBe(current)
  })

  it('shows the error when there is no menu to keep', () => {
    expect(menuAfterFailure({ status: 'loading' }, 'offline')).toEqual({ status: 'error', message: 'offline' })
  })
})

describe('scheduleMenuRefresh', () => {
  const listeners = new Map<string, () => void>()
  let visibilityState = 'visible'

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('window', globalThis)
    vi.stubGlobal('document', {
      get visibilityState() {
        return visibilityState
      },
      addEventListener: (name: string, listener: () => void) => listeners.set(name, listener),
      removeEventListener: (name: string) => listeners.delete(name),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    listeners.clear()
    visibilityState = 'visible'
  })

  it('refreshes every minute, as the theme of the open menu does', () => {
    const load = vi.fn()
    scheduleMenuRefresh(load)

    vi.advanceTimersByTime(MENU_REFRESH_MS * 2)

    expect(MENU_REFRESH_MS).toBe(60_000)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('refreshes when the screen is shown again, not when it is hidden', () => {
    const load = vi.fn()
    scheduleMenuRefresh(load)

    visibilityState = 'hidden'
    listeners.get('visibilitychange')?.()
    expect(load).not.toHaveBeenCalled()

    visibilityState = 'visible'
    listeners.get('visibilitychange')?.()
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('stops when cancelled', () => {
    const load = vi.fn()
    const stop = scheduleMenuRefresh(load)

    stop()
    vi.advanceTimersByTime(MENU_REFRESH_MS * 2)

    expect(load).not.toHaveBeenCalled()
    expect(listeners.has('visibilitychange')).toBe(false)
  })
})
