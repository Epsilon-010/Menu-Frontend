import { afterEach, describe, expect, it, vi } from 'vitest'

class FakeAudioContext {
  static startsAs: AudioContextState = 'suspended'
  static last: FakeAudioContext | null = null
  state: AudioContextState = FakeAudioContext.startsAs
  private listeners: (() => void)[] = []

  constructor() {
    FakeAudioContext.last = this
  }

  addEventListener(_name: string, listener: () => void) {
    this.listeners.push(listener)
  }

  async resume() {
    return undefined
  }

  /** What the browser does once a tap lets the audio start. */
  allow() {
    this.state = 'running'
    this.listeners.forEach((listener) => listener())
  }
}

async function freshModule() {
  vi.resetModules()
  return import('./beep.ts')
}

afterEach(() => {
  vi.unstubAllGlobals()
  FakeAudioContext.startsAs = 'suspended'
  FakeAudioContext.last = null
})

describe('audio lock', () => {
  it('reports the audio as locked while the browser keeps it suspended after a reload', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext)
    const { isAudioLocked, wakeAudio } = await freshModule()

    wakeAudio()

    expect(isAudioLocked()).toBe(true)
  })

  it('reports it unlocked once the browser lets it run, and tells who is listening', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext)
    const { isAudioLocked, subscribeToAudio, wakeAudio } = await freshModule()
    const listener = vi.fn()
    subscribeToAudio(listener)
    wakeAudio()

    FakeAudioContext.last?.allow()

    expect(isAudioLocked()).toBe(false)
    expect(listener).toHaveBeenCalled()
  })

  it('never reports a lock where the audio started on its own', async () => {
    FakeAudioContext.startsAs = 'running'
    vi.stubGlobal('AudioContext', FakeAudioContext)
    const { isAudioLocked, wakeAudio } = await freshModule()

    wakeAudio()

    expect(isAudioLocked()).toBe(false)
  })

  it('never reports a lock where the browser has no audio', async () => {
    vi.stubGlobal('AudioContext', undefined)
    const { isAudioLocked, wakeAudio } = await freshModule()

    wakeAudio()

    expect(isAudioLocked()).toBe(false)
  })
})
