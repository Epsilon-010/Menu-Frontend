/** Whether a staff screen plays its alert sound; remembered per screen in this browser only. */

export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>

const PREFIX = 'menu.sound.'

function defaultStore(): KeyValueStore | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function readSoundEnabled(screen: string, store: KeyValueStore | null = defaultStore()): boolean {
  try {
    return store?.getItem(PREFIX + screen) === 'on'
  } catch {
    return false
  }
}

export function writeSoundEnabled(screen: string, enabled: boolean, store: KeyValueStore | null = defaultStore()): void {
  try {
    store?.setItem(PREFIX + screen, enabled ? 'on' : 'off')
  } catch {
    // Private windows or blocked site data: the toggle still works until the page reloads.
  }
}
