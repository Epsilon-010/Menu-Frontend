/** A short alert tone made with Web Audio: no audio files to load. */

type AudioContextClass = typeof AudioContext

let context: AudioContext | null = null
const listeners = new Set<() => void>()

function notifyAudioChanged(): void {
  listeners.forEach((listener) => listener())
}

function audio(): AudioContext | null {
  try {
    if (context === null) {
      const Ctor: AudioContextClass | undefined =
        globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: AudioContextClass }).webkitAudioContext
      if (!Ctor) return null
      context = new Ctor()
      context.addEventListener('statechange', notifyAudioChanged)
      notifyAudioChanged()
    }
    // Browsers start audio suspended until a tap; turning the sound on is that tap.
    if (context.state === 'suspended') void context.resume().catch(() => undefined)
    return context
  } catch {
    return null
  }
}

/** Tries to start the audio without playing anything; after a reload the browser waits for a tap. */
export function wakeAudio(): void {
  audio()
}

/** True while the browser keeps the audio suspended, so an alert would make no sound. */
export function isAudioLocked(): boolean {
  return context?.state === 'suspended'
}

/** Calls `listener` whenever the audio starts or stops; returns how to stop listening. */
export function subscribeToAudio(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Plays a soft two-note chime; does nothing where the browser has no audio. */
export function playBeep(): void {
  const ctx = audio()
  if (!ctx) return
  try {
    const start = ctx.currentTime
    for (const [offset, frequency] of [
      [0, 880],
      [0.18, 1320],
    ] as const) {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start + offset)
      gain.gain.exponentialRampToValueAtTime(0.25, start + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.3)
      oscillator.connect(gain).connect(ctx.destination)
      oscillator.start(start + offset)
      oscillator.stop(start + offset + 0.32)
    }
  } catch {
    // A missing sound never breaks the screen.
  }
}
