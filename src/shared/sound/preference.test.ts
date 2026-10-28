import { describe, expect, it } from 'vitest'
import { readSoundEnabled, writeSoundEnabled, type KeyValueStore } from './preference.ts'

function memoryStore(): KeyValueStore {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
  }
}

const broken: KeyValueStore = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
}

describe('sound preference', () => {
  it('is off until turned on, and remembers it per screen', () => {
    const store = memoryStore()
    expect(readSoundEnabled('kitchen', store)).toBe(false)

    writeSoundEnabled('kitchen', true, store)

    expect(readSoundEnabled('kitchen', store)).toBe(true)
    expect(readSoundEnabled('waiter', store)).toBe(false)
    writeSoundEnabled('kitchen', false, store)
    expect(readSoundEnabled('kitchen', store)).toBe(false)
  })

  it('stays off without failing when the browser blocks storage', () => {
    expect(readSoundEnabled('kitchen', broken)).toBe(false)
    expect(() => writeSoundEnabled('kitchen', true, broken)).not.toThrow()
    expect(readSoundEnabled('kitchen', null)).toBe(false)
  })
})
