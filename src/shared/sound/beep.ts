/** A short alert tone made with Web Audio: no audio files to load. */

type AudioContextClass = typeof AudioContext

let context: AudioContext | null = null

function audio(): AudioContext | null {
  try {
    if (context === null) {
      const Ctor: AudioContextClass | undefined =
        globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: AudioContextClass }).webkitAudioContext
      if (!Ctor) return null
      context = new Ctor()
    }
    // Browsers start audio suspended until a tap; turning the sound on is that tap.
    if (context.state === 'suspended') void context.resume().catch(() => undefined)
    return context
  } catch {
    return null
  }
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
